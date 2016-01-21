/*
 * TESTISIMO ANGULAR APP
 */

Testisimo.prototype.appHTML = function(){ 
    return  '<!DOCTYPE html>'+
            '<html xmlns:ng="http://angularjs.org" id="ng-app" ng-app="testisimo">'+
                '<head>'+
                    '<link href="' +(this.resources.useCDN ? this.resources.fontAwesomeCDN : this.resources.fontAwesome)+ '" rel="stylesheet">'+
                    '<link href="' +(this.resources.useCDN ? this.resources.bootstrapCDN : this.resources.bootstrap)+'" rel="stylesheet">'+
                    '<script src="' +(this.resources.useCDN ? this.resources.angularCDN : this.resources.angular)+ '"></script>'+

                    '<script type="text/javascript">'+
                    '(' + this.appScript.toString() + ')();' +
                    '</script>'+
                    this.getAppTemplates()+
                    '<style>'+
                    'body { margin-top:40px; }'+
                    '.footer { height:300px; }'+
                    '.btn-default.btn-circle { border-radius:50% }'+
                    '.btn.btn-light { background-color:transparent;border-color:transparent;color:#fff; }'+
                    '.test-nav { position:fixed;top:0px;left:0px;right:0px;background-color:#fff;z-index:9999;background-color:#000; }'+
                    '.test-nav-header { padding:5px;height:40px; }'+
                    '.step.bg-running { background-color:#0000ff; }'+
                    '.step.bg-error { background-color:#ff0000; }'+
                    '.action.bg-running input,.action.bg-running button { background-color:#ceceff; }'+
                    '.action.bg-error input,.action.bg-error button { background-color:#ffefef; }'+
                    '.step-wrapper { }'+
                    '.step-details { padding:5px;margin-bottom:10px; }'+
                    '.step-details label { font-size:11px;margin:0px; }'+
                    '.step-container { }'+
                    '.step { text-align:center;background-color:#808080;padding:5px;border-bottom:1px solid #000; }'+
                    '.step-options { margin-bottom:10px;padding:0px 5px; }'+
                    '.details-container, .error-container { background-color:#eee;border-bottom-left-radius:4px;border-bottom-right-radius:4px;padding:5px;margin:5px;margin-top:0px; }'+
                    '.error-container { color:#ff0000;background-color:#ffefef;font-size:11px;word-wrap:break-word;white-space:normal;padding-top:12px;margin-top:-7px; }'+
                    '.details { }'+
                    '.alert-danger { color:#ff0000;background-color:#ffefef;word-wrap:break-word;white-space:normal;margin:5px; }'+
                    '.nowrap { text-overflow:ellipsis;white-space:nowrap;display:block;width:100%;overflow:hidden; }'+
                    '.dropdown-item-project { font-size:14px;padding-left:5px !important; }'+
                    '.dropdown-item-test a { font-size:11px }'+
                    '</style>'+
                '</head>'+
                '<body>'+
                    '<div ng-controller="TestCtrl">'+
                        '<div class="test-nav">'+
                            '<div class="test-nav-header">'+
                                '<div class="pull-left" style="width:30%">'+
                                    '<div class="btn-group btn-group-sm">'+
                                        '<button class="btn btn-light" ng-click="execSteps(test.steps)" ng-disabled="test.steps.$status===\'executing\'"><i class="fa" ng-class="{\'fa-play\':test.steps.$status!==\'executing\',\'fa-cog fa-spin\':test.steps.$status===\'executing\'}"></i></button>'+
                                        '<button class="btn btn-light" ng-click="execStop()"><i class="fa" ng-class="{\'fa-stop\':test.steps.$status!==\'stopping\',\'fa-cog fa-spin\':test.steps.$status===\'stopping\'}"></i></button>'+
                                    '</div>'+
                                '</div>'+
                                '<div class="pull-left" style="width:70%">'+
                                    '<div class="dropdown">'+
                                        '<button class="btn btn-sm btn-default dropdown-toggle" style="width:100%">'+
                                            '<span class="nowrap">{{test.name||\'(Empty Name)\'}}</span>'+
                                        '</button>'+
                                        '<ul class="dropdown-menu" style="left:-40%;width:140%;">'+
                                            '<li ng-repeat-start="(projectId,project) in projects" class="dropdown-item-project" ng-click="$event.stopPropagation()">'+
                                                '<strong ng-if="!project.$editName" class="nowrap pull-left" style="width:72%;">&nbsp;{{project.name}}</strong>'+
                                                '<div class="input-group" ng-if="project.$editName">'+
                                                    '<input type="text" class="form-control input-sm" ng-model="project.name">'+
                                                    '<span class="input-group-btn">'+
                                                        '<button class="btn btn-default btn-sm" ng-click="updateProject(project);project.$editName=false"><i class="fa fa-check"></i></button>'+
                                                    '</span>'+
                                                '</div>'+
                                                '<div ng-if="!project.$editName" class="pull-right">'+
                                                    '<button class="btn btn-default btn-xs btn-circle" style="border:none" ng-click="project.$editName=true"><i class="fa fa-pencil"></i></button>'+
                                                    '<a href="" class="btn btn-default btn-xs btn-circle" style="border:none" ng-click="exportProject($event,project)" download="{{project.name}}.json"><i class="fa fa-download"></i></a>'+
                                                    '<button class="btn btn-default btn-xs btn-circle" style="border:none" ng-click="removeProject(project)"><i class="fa fa-trash"></i></button>'+
                                                '</div>'+

                                            '</li>'+
                                            '<li ng-repeat-end ng-repeat="(testId,projectTest) in project.tests" class="nowrap dropdown-item-test" ng-class="{active:projectTest.id===test.id}">'+
                                                '<a href="" ng-click="selectTest(projectTest)">{{projectTest.name||\'(Empty Name)\'}}</a>'+
                                            '</li>'+
                                            '<li class="divider"></li>'+
                                            '<li ng-click="$event.stopPropagation()">'+
                                                '<div class="input-group" style="margin:0px 5px;">'+
                                                    '<input type="text" class="form-control input-sm" ng-model="newProjectName" placeholder="Project Name, or JSON Data">'+
                                                    '<span class="input-group-btn">'+
                                                        '<button class="btn btn-default btn-sm" ng-click="createProject(newProjectName);newProjectName=\'\'"><i class="fa fa-plus"></i></button>'+
                                                    '</span>'+
                                                '</div>'+
                                            '</li>'+
                                        '</ul>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+                 
                            '<div class="alert alert-danger" ng-if="error.message">'+
                                '<button class="close" ng-click="error.message=null">&times;</button>'+
                                '<strong>Uncaught Error Occured:</strong><br><small>{{error.message}}</small>'+
                            '</div>'+
                        '</div>'+
                        '<div class="step-details">'+
                            '<strong class="nowrap" style="margin-bottom:5px;">{{project.name}}</strong>'+
                            '<div class="btn-group btn-group-xs" style="width:100%">'+
                                '<button class="btn btn-default btn-xs" style="width:50%" ng-click="createTest()"><i class="fa fa-plus"></i> Create Test</button>'+
                                '<button class="btn btn-default btn-xs" style="width:50%" ng-click="removeTest()"><i class="fa fa-trash"></i> Remove Test</button>'+
                            '</div>'+
                            '<label>Test Name</label>'+
                            '<input type="text" class="form-control input-sm" ng-model="test.name" style="margin-bottom:5px">'+
                            '<label ng-if="objectKeys(test.variables).length">Test Variables (e.g. "{my_var}")</label>'+
                            //'<button class="btn btn-xs btn-default pull-right"><i class="fa fa-refresh"></i> Reftresh</button>'+
                            '<div class="clearfix"></div>'+
                            '<div ng-repeat="(key,value) in test.variables">'+
                                '<input type="text" class="form-control input-sm pull-left" ng-model="key" placeholder="key" disabled="disabled" style="width:50%">'+
                                '<input type="text" class="form-control input-sm pull-left" ng-model="test.variables[key].value" placeholder="value" style="width:50%">'+
                            '</div>'+
                            '<div class="clearfix"></div>'+
                            //'<label>Test ID</label>'+
                            //'<input type="text" class="form-control input-sm" ng-model="test.id" disabled="disabled">'+
                        '</div>'+
                        '<div ng-repeat="step in test.steps">'+
                            '<div class="step-wrapper">'+
                                '<div class="step-container">'+
                                    '<div class="step" ng-class="{\'bg-error\':step.$error,\'bg-running\':step.$executing}"">'+
                                        '<button class="btn btn-default btn-xs btn-circle text-center pull-left" ng-click="step.$collapsed=!step.$collapsed" ng-style="{\'background-color\':step.$collapsed?\'transparent\':null}">'+
                                            '<strong>{{$index+1}}.</strong>'+
                                        '</button>'+
                                        '<div class="btn-group btn-group-xs">'+
                                            '<button class="btn btn-light btn-xs btn-circle" ng-click="execStep(step)" ng-disabled="step.$executing || !step.actions.length"><i class="fa fa-play" ng-class="{\'fa-play\':!step.$executing,\'fa-cog fa-spin\':step.$executing}"></i></button>'+
                                            '<button class="btn btn-light btn-xs btn-circle" ng-click="execFromStep(step)" ng-disabled="step.$executing || !step.actions.length"><i class="fa fa-step-forward"></i></button>'+
                                        '</div>&nbsp;'+
                                        '<div class="btn-group btn-group-xs">'+
                                            '<button class="btn btn-light btn-xs btn-circle" ng-click="copyStep(step)" ng-disabled="step.$executing"><i class="fa fa-copy"></i></button>'+
                                            '<button class="btn btn-light btn-xs btn-circle" ng-click="test.steps.splice($index+1,0,{actions:[{}] })" ng-disabled="step.$executing"><i class="fa fa-plus"></i></button>'+
                                        '</div>&nbsp;'+
                                        '<div class="btn-group btn-group-xs">'+
                                            '<button class="btn btn-light btn-xs btn-circle" ng-click="moveStep(step, $index-1)" ng-disabled="step.$executing || $first"><i class="fa fa-arrow-up"></i></button>'+
                                            '<button class="btn btn-light btn-xs btn-circle" ng-click="moveStep(step, $index+1)" ng-disabled="step.$executing || $last"><i class="fa fa-arrow-down"></i></button>'+
                                        '</div>'+
                                        '<button class="btn btn-light btn-xs btn-circle pull-right" ng-click="test.steps.splice($index, 1)" ng-disabled="step.$executing || test.steps.length===1"><i class="fa fa-trash"></i></button>'+
                                    '</div>'+
                                    '<div class="step-options" ng-if="!step.$collapsed">'+
                                        '<div style="margin-top:2px;">'+
                                            '<div class="input-group">'+
                                                '<input type="text" class="form-control input-sm" placeholder="selected elements" value="{{selectedElementPreview(step)}}" disabled="disabled">'+
                                                '<span class="input-group-btn">'+
                                                    '<button class="btn btn-default btn-sm" ng-click="expanded={elements:!expanded.elements};step.$selector=step.selector;step.$match=objectToArrayMatch(step.match)" ng-class="{active:expanded.elements}"><i class="fa fa-fw fa-code"></i></button>'+
                                                '</span>'+
                                            '</div>'+
                                        '</div>'+
                                        '<div class="details-container" ng-if="expanded.elements">'+
                                            '<div class="details">'+
            '<button class="btn btn-default btn-sm" ng-click="step.$selectionMode||selectElements(step)" style="width:50%" ng-class="{active:step.$selectionMode}"><i class="fa fa-crosshairs"></i> Pick</button>'+
                                                '<button class="btn btn-default btn-sm" ng-click="showSelectedElements(step)" style="width:50%"><i class="fa fa-eye"></i> Show ({{step.$selectedLength||0}})</button>'+
                                                '<div class="text-center">'+
                                                    '<small>css selector (and optional attributes)</small>'+
                                                    '<input type="text" class="form-control input-sm" ng-model="step.$selector" placeholder="css selector" ng-change="step.selector=step.$selector">'+
                                                '</div>'+
                                                '<div ng-repeat="attr in step.$match">'+
                                                    '<input class="form-control input-sm pull-left" ng-model="attr.name" ng-change="updateMatch(step)" style="width:40%" placeholder="attr. name">'+
                                                    '<div class="dropdown pull-left" style="width:10%;">'+
                                                        '<button class="btn btn-sm btn-default dropdown-toggle" style="width:100%;padding:2px 0px;">'+
                                                            '<span style="font-size:16px">{{attr.operator}}</span>'+
                                                        '</button>'+
                                                        '<ul class="dropdown-menu" style="left:-92px;">'+
                                                            // = equal to
                                                            // ~ contains in space separated list
                                                            // | contains in hyphen separated list
                                                            // ^ starts with
                                                            // $ ends with
                                                            // * contains substring
                                                            '<li><a href="" ng-click="attr.operator=\'=\';updateMAtch(step)"><strong>=</strong>&nbsp;&nbsp;exact match</a></li>'+
                                                            '<li><a href="" ng-click="attr.operator=\'*\';updateMatch(step)"><strong>*</strong>&nbsp;&nbsp;contains substring</a></li>'+
                                                            '<li><a href="" ng-click="attr.operator=\'~\';updateMatch(step)"><strong>~</strong>&nbsp;&nbsp;is in space separated list</a></li>'+
                                                            '<li><a href="" ng-click="attr.operator=\'|\';updateMatch(step)"><strong>|</strong>&nbsp;&nbsp;is in hyphen separated list</a></li>'+
                                                            '<li><a href="" ng-click="attr.operator=\'^\';updateMatch(step)"><strong>^</strong>&nbsp;&nbsp;starts with</a></li>'+
                                                            '<li><a href="" ng-click="attr.operator=\'$\';updateMatch(step)"><strong>$</strong>&nbsp;&nbsp;ends with</a></li>'+
                                                        '</ul>'+
                                                    '</div>'+
                                                    '<input class="form-control input-sm pull-left" ng-model="attr.value" ng-change="updateMatch(step)" style="width:40%" placeholder="value">'+
                                                    '<button class="btn btn-sm btn-default" ng-click="step.$match.splice($index,1);updateMatch(step)" style="width:10%;padding:5px 0px;"><i class="fa fa-minus"></i></button>'+
                                                '</div>'+
                                                '<div class="text-center">' +
                                                    '<button class="btn btn-default btn-xs btn-circle" ng-click="step.$match.push({operator:\'=\',value:\'\'});updateMatch(step)"><i class="fa fa-plus"></i></button>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                        '<div>' +
                                            '<div ng-repeat-start="action in step.actions track by $index" class="action" style="margin-top:2px;" ng-class="{\'bg-error\':action.$error,\'bg-running\':action.$executing}">'+
                                                '<div class="input-group">'+
                                                    '<input type="text" class="form-control input-sm" placeholder="action details" disabled="disabled" value="{{actionPreview(action)}}">'+
                                                    '<span class="input-group-btn">'+
                                                    '<button class="btn btn-default btn-sm" ng-click="action.$expanded=!action.$expanded" ng-class="{active:action.$expanded}"><i class="fa fa-fw fa-cog"></i></button>'+
                                                    '</span>'+
                                                '</div>'+
                                            '</div>'+
                                            '<div ng-repeat-end>'+
                                                '<div class="details-container" ng-if="action.$expanded">'+
                                                    '<div class="details">'+
                                                        '<button class="btn btn-default btn-sm" style="width:25%" ng-click="execStep(step, $index)" ng-disabled="!action.action"><i class="fa fa-play"></i></button>'+
                                                        '<button class="btn btn-default btn-sm" style="width:25%" ng-click="moveAction(step,action,$index-1)" ng-disabled="$first"><i class="fa fa-arrow-up"></i></button>'+
                                                        '<button class="btn btn-default btn-sm" style="width:25%" ng-click="moveAction(step,action,$index+1)" ng-disabled="$last"><i class="fa fa-arrow-down"></i></button>'+
                                                        '<button class="btn btn-default btn-sm" style="width:25%" ng-click="step.actions.splice($index,1)"><i class="fa fa-trash"></i></button>'+
                                                        '<select class="form-control input-sm" placeholder="action" ng-options="id as a.name for (id,a) in availableActions" ng-model="action.action"></select>'+
                                                        '<div action-template></div>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="error-container" ng-if="action.$error">'+
                                                    '<div class="details">{{action.$error}}'+
                                                    '</div>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                        '<div class="text-center">' +
                                            '<button class="btn btn-default btn-xs btn-circle" ng-click="step.actions.push({$expanded:true})"><i class="fa fa-cog"></i></button>'+
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+

                    '</div>'+
                    '<div class="footer"></div>'+
                    '<h5 class="text-center">Testisimo &copy; 2016</h5>'
                '</body>'+
            '</html>';
};

Testisimo.prototype.appScript = function(){
    angular.module('testisimo',[])
    .run(['$rootScope','testisimo', function($rootScope, testimo){
        testisimo.addEventListener(function(eventName, obj){
            $rootScope.$broadcast('testisimo:'+eventName, obj);
        });
    }])
    // TODO: prevent infinite loop if exception is throwed and testisimo emit error
    //.factory('$exceptionHandler', function(){
    //    return function(exception, cause){
    //        throw exception;
    //    };
    //})
    .factory('testisimo',['$window', function($window){
        return $window.testisimo;
    }])
    .directive('dropdown', ['$document', function($document){
        return {
            restrict:'C',
            link: function(scope, elm, attrs){
                var toggler = angular.element(elm[0].querySelector('.dropdown-toggle'));
                toggler.on('click', function(e){
                    if(!elm.hasClass('open')) {
                        e.stopPropagation();
                        elm.addClass('open');
                        $document.on('click', hide);
                    }
                });

                function hide(){
                    elm.removeClass('open');
                    $document.off('click', hide);
                }

                scope.$on('$destroy', function(){
                    $document.off('click', hide);
                });
            }
        };
    }])
    .directive('actionTemplate', ['testisimo', function(testisimo){
        return {
            restrict:'A',
            template: '<div ng-include="$parent.action.action"></div>',
            link: function(scope, elm, attrs){
                scope.$watch(function(){
                    return scope.$parent.action.action;
                }, copyTemplateScope);

                // copy scope methods
                var addedKeys = [];
                function copyTemplateScope(){
                    var action = testisimo.actions[ scope.$parent.action.action ];
                    if(addedKeys.length){
                        for(var key in scope) if(addedKeys.indexOf(key) > -1) {
                            delete scope[key];
                        }
                    }
                    if(!action || !action.optsTemplateScope) {
                        addedKeys = [];
                        return;
                    }
                    for(var key in action.optsTemplateScope) scope[key] = action.optsTemplateScope[key];
                    addedKeys = Object.keys(action.optsTemplateScope);
                }
            }
        };
    }])
    .directive('stepContainer', ['$window', function($window){
        return {
            restrict:'C',
            link: function(scope, elm, attrs){
                scope.$on('testisimo:execError', function(e, position){
                    if(scope.executingSequence && scope.$index === position.step){
                        $window.scrollTo(0,elm[0].offsetTop-140);
                    }
                });
            }
        };
    }])
    .controller('TestCtrl',['$scope','$timeout','$interval','testisimo',function($scope, $timeout, $interval, testisimo){
        $scope.wasResumed = false; // check if test is resumed after location change
        $scope.log = function(){
            console.log(arguments.length >= 1 ? arguments[0] : arguments);
        };
        $scope.testisimo = testisimo;
        $scope.copy = angular.copy;
        $scope.merge = angular.merge;
        $scope.objectKeys = function(obj){
            return Object.keys(obj||{});
        };

        $scope.executingSequence = false;
        $scope.execStep = function(step, actionIndex){
            $scope.executingSequence = false;
            var index = $scope.test.steps.indexOf(step);
            if(index === -1) return;
            var stepClone = angular.copy(step);
            stepClone.index = index;
            if(typeof actionIndex === 'number' && actionIndex > -1) {
                stepClone.actionIndex = actionIndex;
                stepClone.actions = stepClone.actions.slice(0, actionIndex+1);
            }
            testisimo.executeSteps([stepClone], $scope.test.variables);
        };

        $scope.execFromStep = function(step, actionIndex){
            $scope.executingSequence = true;
            var index = $scope.test.steps.indexOf(step);
            var stepsClone = angular.copy($scope.test.steps);
            if(typeof actionIndex === 'number' && actionIndex > -1) stepsClone[index].actionIndex = actionIndex;
            if(index > -1) testisimo.executeSteps(stepsClone, $scope.test.variables, null, index);
        };

        $scope.execSteps = function(steps){
            $scope.executingSequence = true;
            testisimo.executeSteps(steps, $scope.test.variables);
        };

        $scope.execStop = function(){
            $scope.test.steps.$status = 'stopping';
            testisimo.forceStop = true;
        };

        $scope.$on('testisimo:execStart', function(e, position){
            testisimo.sessionStore.set({
                projectId: $scope.test.projectId,
                testId: $scope.test.id,
                status: 'executing',
                step: position.step,
                action: position.action,
                parentTests: testisimo.parentTests,
                executingSequence: $scope.executingSequence,
                resumed: $scope.wasResumed
            });

            $timeout(function(){
                $scope.test.steps.$status = 'executing';
                $scope.test.steps[position.step].$executing = true;
                $scope.test.steps[position.step].$error = false;
                for(var i=0;i<$scope.test.steps[position.step].actions.length;i++) {
                    $scope.test.steps[position.step].actions[i].$executing = false;
                    $scope.test.steps[position.step].actions[i].$error = null;
                }
                $scope.test.steps[position.step].actions[position.action].$executing = true;
                $scope.test.steps[position.step].actions[position.action].$error = null;
            });
        });

        $scope.error = { message:testisimo.lastError };
        $scope.$on('testisimo:execError', function(e, position){
            $scope.wasResumed = false;
            testisimo.sessionStore.set({
                projectId: $scope.test.projectId,
                testId: $scope.test.id,
                status: 'error',
                step: position.step,
                action: position.action,
                parentTests: testisimo.parentTests,
                resumed: $scope.wasResumed
            });

            $timeout(function(){
                if(position.step === null) return $scope.error.message = position.message;

                $scope.test.steps.$status = '';
                $scope.test.steps[position.step].$executing = false;
                $scope.test.steps[position.step].$error = true;
                $scope.test.steps[position.step].actions[position.action].$executing = false;
                $scope.test.steps[position.step].actions[position.action].$error = position.message;
            });
        });

        $scope.$on('testisimo:execEnd', function(e, position){
            $scope.wasResumed = false;
            testisimo.sessionStore.set({
                projectId: $scope.test.projectId,
                testId: $scope.test.id,
                status: 'end',
                step: position.step,
                action: position.action,
                parentTests: testisimo.parentTests,
                resumed: $scope.wasResumed
            });

            $timeout(function(){
                $scope.test.steps.$status = '';
                $scope.test.steps[position.step].$executing = false;
                $scope.test.steps[position.step].$error = false;
                $scope.test.steps[position.step].actions[position.action].$executing = false;
            });
        });

        $scope.availableActions = sortObject(testisimo.actions, 'name');

        function sortObject(obj, sortProp){
            var sortedKeys = [], result = {}, tempKeys = {};
            for(var key in obj) sortedKeys.push({ key:key, value:obj[key][sortProp] });
            sortedKeys.sort(function(a,b){
                if (a.value < b.value) return -1;
                if (a.value > b.value) return 1;
                return 0;
            });
            for(var i=0;i<sortedKeys.length;i++) result[ sortedKeys[i].key ] = obj[ sortedKeys[i].key ];
            return result;
        }

        $scope.copyStep = function(step){
            var index = $scope.test.steps.indexOf(step);
            var copy = angular.copy(step);
            copy.$error = null;
            for(var i=0;i<copy.actions.length;i++) copy.actions[i].$error = null;
            $scope.test.steps.splice(index+1,0, copy);
        };

        var selectedCb;
        $scope.selectElements = function(step){
            step.$selectionMode = true;

            selectedCb = function(target){
                step.$selector = (target.tagName||'').toLowerCase();
                step.$match = [];
                for(var key in target.attrs) step.$match.push({ name:key, operator:'=', value:target.attrs[key] });
                step.$match.push({ name:'isVisible', operator:'=', value:'true' });
                step.$selectionMode = false;
                $scope.updateMatch(step);
            };
            testisimo.selectMode();
        };

        $scope.$on('testisimo:selected', function(e, target){
            $timeout(function(){
                if(selectedCb) selectedCb(target);
                selectedCb = null;
            });
        });

        $scope.showSelectedElements = function(step){
            step.$selectedLength = testisimo.selectElements(step.$selector, $scope.arrayToObjectMatch(step.$match), $scope.test.variables).length;
        };

        $scope.arrayToObjectMatch = function(array){
            var result = {};
            for(var i=0;i<array.length;i++) {
                if(array[i].name && array[i].name[0]!=='$') result[ array[i].name ] = array[i].operator + array[i].value;
            }
            return result;
        };

        $scope.objectToArrayMatch = function(object){
            var result = [];
            for(var key in object) {
                if(key[0]!=='$'){
                    object[ key ] = object[ key ] || '';
                    var newItem = {};
                    newItem.name = key;
                    newItem.operator = ['=','~','|','^','$','*'].indexOf(object[ key ][0]) > -1 ? object[ key ][0] : '';
                    newItem.value = object[ key ].substring(newItem.operator ? 1 : 0);
                    newItem.operator = newItem.operator || '=';
                    result.push(newItem);
                }
            }
            return result;
        };

        $scope.updateMatch = function(step){
            step.selector = step.$selector;
            step.match = $scope.arrayToObjectMatch(step.$match);
        };

        function arrayToObject(array, keyName, valueName){
            keyName = keyName || 'name';
            valueName = valueName || 'value';

            var result = {};
            for(var i=0;i<array.length;i++) {
                if(array[i][keyName] && array[i][keyName][0]!=='$') result[ array[i][keyName] ] = array[i][valueName];
            }
            return result;
        }
        $scope.arrayToObject = arrayToObject;

        function objectToArray(object, keyName, valueName){
            keyName = keyName || 'name';
            valueName = valueName || 'value';

            var result = [];
            for(var key in object) {
                if(key[0]!=='$'){
                    var newItem = {};
                    newItem[ keyName ] = key;
                    newItem[ valueName ] = object[ key ];
                    result.push(newItem);
                }
            }
            return result;
        }
        $scope.objectToArray = objectToArray;

        $scope.selectedElementPreview = function(step){
            var preview = step.selector;
            for(var key in step.match) preview += (preview ? ',' : '') + key+'='+step.match[key];
            return preview;
        };

        $scope.actionPreview = function(action){
            if(!action.action) return '';
            var aAction = $scope.availableActions[ action.action ];
            if(aAction && typeof aAction.optsPreview === 'function') return aAction.optsPreview(action.opts || {});

            var isFirst = true;
            var preview = (aAction ? aAction.name : action.action) + ' (';
            for(var key in (action.opts||{})) {
                preview += (!isFirst ? ',' : '') + key+'='+action.opts[key];
                isFirst = false;
            }
            return preview + ')';
        };

        $scope.moveStep = function(step, newIndex){
            var oldIndex = $scope.test.steps.indexOf(step);
            $scope.test.steps.splice(oldIndex, 1);
            $scope.test.steps.splice(newIndex, 0, step);
        };

        $scope.moveAction = function(step, action, newIndex){
            var oldIndex = step.actions.indexOf(action);
            step.actions.splice(oldIndex, 1);
            step.actions.splice(newIndex, 0, action);
        };


        // LOCAL STORE

        $scope.createTest = function(){
            $scope.test = testisimo.localStore.createTest($scope.project);
        };

        $scope.removeTest = function(){
            if (confirm('Remove Test "' +$scope.test.name+ '" permanently ?')) {
                testisimo.localStore.removeTest($scope.test);
                $scope.test = testisimo.localStore.getCurrentTest();
                $scope.test = testisimo.localStore.getTest($scope.test.id);
                $scope.project = testisimo.localStore.getProjects()[ $scope.test.projectId ];
            }
        };

        $scope.createProject = function(nameOrData){
            // try import project first
            if(!testisimo.localStore.importProject(nameOrData)) testisimo.localStore.createProject(nameOrData);
        };

        $scope.updateProject = function(project){
            testisimo.localStore.setProject(project);
        };

        $scope.removeProject = function(project){
            if(confirm('Remove Project "' +(project || $scope.project).name+ '" permanently ?')) {
                testisimo.localStore.removeProject(project || $scope.project);
                if(!project || project.id===$scope.project.id) {
                    $scope.test = testisimo.localStore.getCurrentTest();
                    $scope.test = testisimo.localStore.getTest($scope.test.id);
                    $scope.project = testisimo.localStore.getProjects()[ $scope.test.projectId ];
                }
            }
        };

        $scope.setCurrentTest = function(){
            testisimo.localStore.setCurrentTest($scope.test);
        };

        $scope.selectTest = function(test){
            $scope.test = testisimo.localStore.getTest(test.id);
            $scope.project = testisimo.localStore.getProjects()[ test.projectId ];
            $scope.setCurrentTest();
        };

        $scope.exportProject = function(event, project){
            var link = event.target.tagName === 'A' ? event.target : event.target.parentNode;
            link.href = testisimo.localStore.exportProjectURL(project);
        };

        // load current test from localstorage
        $scope.projects = testisimo.localStore.getProjects();
        $scope.test = testisimo.localStore.getCurrentTest();
        $scope.selectTest($scope.test);

        var lastPosition = testisimo.sessionStore.get();
        if(lastPosition.status === 'executing') {
            $scope.wasResumed = true;
            var step = $scope.test.steps[lastPosition.step];
            var action = step ? step.actions[lastPosition.action] : null;
            var nextStep = $scope.test.steps[lastPosition.step+1];
            testisimo.parentTests = lastPosition.parentTests || [];

            if(action && ($scope.availableActions[ action.action ]||{}).repeatAfterLocationChange){
                lastPosition.action--;
            }

            if(action){
                if(lastPosition.executingSequence) $scope.execFromStep(step, lastPosition.action+1);
                else $scope.execStep(step, lastPosition.action+1);
            }
            else if(nextStep && lastPosition.executingSequence){
                $scope.execFromStep(nextStep, 0);
            }
        }

        function concatVariables(oldVariables, newVariables, keys){
            for(var i=0;i<keys.length;i++) newVariables[ keys[i] ] = {
                value: oldVariables[keys[i]] ? (oldVariables[keys[i]].value || '') : ''
            };
        }

        function findAllVariables(test){
            var step, 
                action, 
                match, 
                oldVariables = test.variables || {}, 
                variables = {};

            for(var i=0;i<test.steps.length;i++){
                step = test.steps[i];

                // search in selector
                concatVariables(oldVariables, variables, testisimo.extractVariableNames(step.selector));

                // search in match
                for(var key in step.match) {
                    concatVariables(oldVariables, variables, testisimo.extractVariableNames(key));
                    concatVariables(oldVariables, variables, testisimo.extractVariableNames(step.match[key]));
                }

                // search in actions
                for(var j=0;j<step.actions.length;j++){
                    action = $scope.availableActions[ step.actions[j].action ];
                    if(action){
                        step.actions[j].opts = step.actions[j].opts || {};
                        if(typeof action.optsVariables === 'function') concatVariables(oldVariables, variables, action.optsVariables(step.actions[j].opts));
                        else if(action.optsVariables) for(var v=0;v<action.optsVariables.length;v++) {
                            concatVariables(oldVariables, variables, testisimo.extractVariableNames(step.actions[j].opts[ action.optsVariables[v] ]));
                        }
                    }
                }
            }

            test.variables = variables;
        }

        var testChanged = null;
        $scope.$watch('test', function(newValue, oldValue){
            if(testChanged === null) testChanged = false; // first change on
            else if(newValue && oldValue && newValue.id === oldValue.id) testChanged = true;
        }, true);

        var saveInterval = $interval(function(){
            if(testChanged) {
                findAllVariables($scope.test);
                testisimo.localStore.setTest($scope.test);
                testChanged = false;
            }
        }, 1000);

        $scope.$on('$destroy', function(){
            $interval.cancel(saveInterval);
        });
    }]);
};