Testisimo.prototype.actions.runTest = {
    name:' » Run Test',
    optsTemplateScope:{
        mergeVariables: function(defaultVariables, variables){
            defValues = {};
            for(var key in defaultVariables) defValues[key] = {
                defaultValue: defaultVariables[key].value
            };
            return angular.merge(defValues, variables);
        }
    },
    optsTemplate:
    '<select class="form-control input-sm" placeholder="choose test" '+
    'style="margin-bottom:5px"'+
    'ng-options="t.id as t.name disable when t.id===test.id for (id,t) in project.tests" '+
    'ng-model="action.opts.testId" '+
    'ng-change="action.opts.testVariables=mergeVariables(testisimo.localStore.getTest(action.opts.testId).variables||{},{})">'+
    '</select>'+
    '<div class="clearfix">'+
    '<small><strong>Override Variables</strong></small>'+
    '<button class="btn btn-default btn-xs pull-right" '+
    'ng-click="action.opts.testVariables=mergeVariables(testisimo.localStore.getTest(action.opts.testId).variables||{},action.opts.testVariables)">'+
    '<i class="fa fa-refresh"></i> Refresh'+
    '</button>'+
    '</div>'+
    '<div ng-repeat="(key,value) in action.opts.testVariables" class="clearfix">'+
    '<input type="text" class="form-control input-sm pull-left" style="width:50%" ng-model="key" disabled="disabled">'+
    '<input type="text" class="form-control input-sm pull-left" style="width:50%" ng-model="action.opts.testVariables[key].value" placeholder="{{action.opts.testVariables[key].defaultValue}}">'+
    '</div>',
    optsVariables: function(opts){
        var varNames = [];
        opts.testVariables = opts.testVariables || {};
        for(var key in opts.testVariables){
            if(opts.testVariables[key].value) {
                varNames = varNames.concat(testisimo.extractVariableNames(opts.testVariables[key].value));
            }
        }
        return varNames;
    },
    optsPreview: function(opts){
        var project = testisimo.localStore.getCurrentProject();
        var testName = (project.tests[ opts.testId ] || {}).name || '';
        return this.name.substring(1) + ' "' +testName+ '"';
    },
    repeatAfterLocationChange: true,
    handler: function(targets, opts, variables, done){
        if(!opts.testId) return done(new Error('Test Id not defined, choose one in action details, please'));
        var project = testisimo.localStore.getCurrentProject();
        var thisTestId = testisimo.localStore.getCurrentTest().id;
        var thisTestName = testisimo.localStore.getCurrentTest().name;
        var test = testisimo.localStore.getTest(opts.testId);
        var wasResumed = testisimo.sessionStore.get().resumed;
        var resumedStepIndex = 0;
        var resumedActionIndex = 0;
        if(!project.tests[ opts.testId ] || !test) return done(new Error('Test "' +opts.testId+ '" not found in this project'));

        testisimo.parentTestsLevel = testisimo.parentTestsLevel || 0;
        if(testisimo.parentTestsLevel > 0) {
            thisTestId = opts.testId;
            thisTestName = test.name;
        }

        var level = -1, testDuplicities = {};
        for(var i=0;i<testisimo.parentTests.length;i++){
            if(testDuplicities[ testisimo.parentTests[i].id ]) return done(new Error('Nested Test "' +testisimo.parentTests[i].name+ '" duplicity found - preventing infinite loop'));
            testDuplicities[ testisimo.parentTests[i].id ] = true;
            if(testisimo.parentTests[i].id === thisTestId) level = i;
        }

        // check if this is resumed step action after location change
        if(level > -1){
            resumedStepIndex = testisimo.parentTests[level].child.step;
            resumedActionIndex = testisimo.parentTests[level].child.action;
            if(!testisimo.actions[ test.steps[resumedStepIndex].actions[resumedActionIndex].action ].repeatAfterLocationChange) resumedActionIndex++;
        }
        // not resumed
        else {
            testisimo.parentTests.push({
                id: thisTestId,
                step: testisimo.runningStepIndex,
                action: testisimo.runningActionIndex
            });
            level = testisimo.parentTests.length-1;
        }

        // prepare variables for nested test (copy and override)
        var testVariables = {};
        opts.testVariables = opts.testVariables || {};
        for(var key in opts.testVariables){
            if(opts.testVariables[key].value) {
                testVariables[key] = { 
                    value: testisimo.replaceVariables(opts.testVariables[key].value || opts.testVariables[key].defaultValue, variables) 
                };
            }
        }
        // add variables that are in nested test but not in opts
        if(test.variables) for(var key in test.variables){
            if(!testVariables[key]) testVariables[key] = test.variables[key];
        }

        var previousInterceptor = testisimo.eventsInterceptor;
        testisimo.eventsInterceptor = function(eventName, position, listener){
            if(position && typeof position.step === 'number'){
                // store last child position to recover after location change
                testisimo.parentTests[ level ].child = {
                    step: position.step,
                    action: position.action
                };

                // temporarly set position to this action
                position.step = testisimo.parentTests[0].step;
                position.action = testisimo.parentTests[0].action;

                // add nested levels to message if it is defined
                if(position.message) {
                    var chain = '';
                    for(var l=1;l<testisimo.parentTests.length;l++) chain += project.tests[ testisimo.parentTests[l].id ].name + (l===testisimo.parentTests.length-1 ? ': ' :' --> ');
                    position.message = chain + position.message;
                }
            }
            listener(eventName, position);
        }

        // clone steps
        var steps = [].concat(test.steps);
        // clone step
        steps[resumedStepIndex] = {
            selector: steps[resumedStepIndex].selector,
            match: steps[resumedStepIndex].match,
            actions: steps[resumedStepIndex].actions,
            actionIndex: resumedActionIndex
        };

        if(testisimo.forceStop) return done();

        testisimo.parentTestsLevel++;
        testisimo.executeSteps(steps, testVariables, function(err){
            if(!err){
                // set position back to this action, if err it will clear
                var parentTest = testisimo.parentTests.pop();
                testisimo.runningStepIndex = parentTest.step;
                testisimo.runningActionIndex = parentTest.action;
            }
            testisimo.eventsInterceptor = previousInterceptor;
            testisimo.parentTestsLevel--;
            done();
        }, resumedStepIndex);
    }
};