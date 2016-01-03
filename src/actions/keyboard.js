// TODO:
// keypress

Testisimo.prototype.actions.setValueKeyboard = {
    name:'Keyboard Input',
    optsTemplate:'<input type="text" class="form-control input-sm" placeholder="text to write" ng-model="action.opts.text">',
    optsVariables: ['text'], // which opts properties can contain text variabes e.g. {myvar}
    optsPreview: function(opts){
        return this.name + ' "' +(opts.text||'')+ '"';
    },
    handler: function(targets, opts, variables, done){
        if(targets.length === 0) return done(new Error('Target element not found'));
        if(targets.length > 1) return done(new Error('Multiple target elements not allowed'));
        if(targets[0].tagName !== 'INPUT' && targets[0].tagName !== 'TEXTAREA') return done(new Error('Target must be input or textarea'));
        if(['checkbox','radio'].indexOf(targets[0].type) > -1) return done(new Error('Boolean inputs (checkbox or radio) not allowed'));

        var elm = targets[0].elm;
        var text = testisimo.replaceVariables(opts.text, variables);

        // input template
        simulateUserInput(elm, text, done);

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function simulateUserInput(testElms, text, cb, index){
            if(testisimo.forceStop) return cb ? cb() : null; 

            index = index || 0;
            if(index === 0) {
                elm.focus();
                elm.value = ''; // clear value if input
            }

            setTimeout(function(){
                elm.dispatchEvent(new KeyboardEvent('keypress', {bubbles:true, cancelable:true, char:text[index] }));
                // set value
                elm.value = elm.value + text[index];
                // trigger onchange
                var evt = document.createEvent('HTMLEvents');
                evt.initEvent('change', false, true);
                elm.dispatchEvent(evt);

                if(index+1 < text.length) simulateUserInput(elm, text, cb, index+1);
                else if(cb) cb();
            }, getRandomInt(50, 200)*testisimo.speed);
        }
    }
};