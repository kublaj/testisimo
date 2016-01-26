
Testisimo.prototype.actions.keyboardWrite = {
    name:'Keyboard Write',
    optsTemplate:'<input type="text" class="form-control input-sm" placeholder="text to write" ng-model="action.opts.text">',
    optsVariables: ['text'], // which opts properties can contain text variabes e.g. {myvar}
    optsPreview: function(opts){
        return this.name + ' "' +(opts.text||'')+ '"';
    },
    handler: function(targets, opts, variables, done){
        if(targets.length === 0) return done(new Error('Target element not found'));
        if(targets.length > 1) return done(new Error('Multiple target elements not allowed'));
        if(targets[0].offsetParent === null) return done(new Error('Target element is not visible'));
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
                var evtOpts = { bubbles:true, cancelable:true, char:text[index] };
                elm.dispatchEvent(new KeyboardEvent('keydown', evtOpts));
                elm.dispatchEvent(new KeyboardEvent('keypress', evtOpts));
                elm.dispatchEvent(new KeyboardEvent('keyup', evtOpts));
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

Testisimo.prototype.actions.keyboardKeypress = {
    name:'Keyboard Keypress',
    optsTemplateScope:{
        keyCodes:{
            'backspace' : '8',
            'tab' : '9',
            'enter' : '13',
            'shift' : '16',
            'ctrl' : '17',
            'alt' : '18',
            'pause_break' : '19',
            'caps_lock' : '20',
            'escape' : '27',
            'page_up' : '33',
            'page down' : '34',
            'end' : '35',
            'home' : '36',
            'left_arrow' : '37',
            'up_arrow' : '38',
            'right_arrow' : '39',
            'down_arrow' : '40',
            'insert' : '45',
            'delete' : '46',
            '0' : '48',
            '1' : '49',
            '2' : '50',
            '3' : '51',
            '4' : '52',
            '5' : '53',
            '6' : '54',
            '7' : '55',
            '8' : '56',
            '9' : '57',
            'a' : '65',
            'b' : '66',
            'c' : '67',
            'd' : '68',
            'e' : '69',
            'f' : '70',
            'g' : '71',
            'h' : '72',
            'i' : '73',
            'j' : '74',
            'k' : '75',
            'l' : '76',
            'm' : '77',
            'n' : '78',
            'o' : '79',
            'p' : '80',
            'q' : '81',
            'r' : '82',
            's' : '83',
            't' : '84',
            'u' : '85',
            'v' : '86',
            'w' : '87',
            'x' : '88',
            'y' : '89',
            'z' : '90',
            'left_window key' : '91',
            'right_window key' : '92',
            'select_key' : '93',
            'numpad 0' : '96',
            'numpad 1' : '97',
            'numpad 2' : '98',
            'numpad 3' : '99',
            'numpad 4' : '100',
            'numpad 5' : '101',
            'numpad 6' : '102',
            'numpad 7' : '103',
            'numpad 8' : '104',
            'numpad 9' : '105',
            'multiply' : '106',
            'add' : '107',
            'subtract' : '109',
            'decimal point' : '110',
            'divide' : '111',
            'f1' : '112',
            'f2' : '113',
            'f3' : '114',
            'f4' : '115',
            'f5' : '116',
            'f6' : '117',
            'f7' : '118',
            'f8' : '119',
            'f9' : '120',
            'f10' : '121',
            'f11' : '122',
            'f12' : '123',
            'num_lock' : '144',
            'scroll_lock' : '145',
            'semi_colon' : '186',
            'equal_sign' : '187',
            'comma' : '188',
            'dash' : '189',
            'period' : '190',
            'forward_slash' : '191',
            'grave_accent' : '192',
            'open_bracket' : '219',
            'backslash' : '220',
            'closebracket' : '221',
            'single_quote' : '222'
        },
        getKeyName: function(keyCode){
            keyCode = keyCode.toString();
            for(var key in this.keyCodes) if(this.keyCodes[key] === keyCode) return key;
            return keyCode;
        },
        setKey: function(event, opts){
            event.preventDefault();
            event.stopPropagation();
            
            opts.key = {
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey,
                keyIdentifier: event.keyIdentifier,
                charCode: event.charCode,
                keyCode: event.keyCode,
                name: ((event.altKey && event.keyCode!==18) ? 'Alt + ' : (event.ctrlKey && event.keyCode!==17) ? 'Ctrl + ' : (event.shiftKey && event.keyCode!==16) ? 'Shift + ' : (event.metaKey && event.keyIdentifier!=='Meta') ? 'Meta + ' : '') + this.getKeyName(event.keyCode)
            };
        }
    },
    optsTemplate:'<input type="text" class="form-control input-sm" placeholder="press key" ng-model="action.opts.key.name" ng-keydown="setKey($event,action.opts)">',
    //optsVariables: ['key'], // which opts properties can contain text variabes e.g. {myvar}
    optsPreview: function(opts){
        return this.name + ' "' +((opts.key||{}).name||'')+ '"';
    },
    handler: function(targets, opts, variables, done){
        if(targets.length === 0) return done(new Error('Target element not found'));
        if(targets.length > 1) return done(new Error('Multiple target elements not allowed'));
        if(targets[0].offsetParent === null) return done(new Error('Target element is not visible'));
        if(targets[0].tagName !== 'INPUT' && targets[0].tagName !== 'TEXTAREA') return done(new Error('Target must be input or textarea'));
        if(['checkbox','radio'].indexOf(targets[0].type) > -1) return done(new Error('Boolean inputs (checkbox or radio) not allowed'));

        var elm = targets[0].elm;
        var key = opts.key;

        // focus element
        elm.focus();

        setTimeout(function(){
            var evtOpts = {
                bubbles:true, 
                cancelable:true, 
                altKey: key.altKey,
                ctrlKey: key.ctrlKey,
                shiftKey: key.shiftKey,
                metaKey: key.metaKey,
                keyIdentifier: key.keyIdentifier,
                charCode: key.charCode,
                keyCode: key.keyCode
            };
            
            elm.dispatchEvent(new KeyboardEvent('keydown', evtOpts));
            elm.dispatchEvent(new KeyboardEvent('keypress', evtOpts));
            elm.dispatchEvent(new KeyboardEvent('keyup', evtOpts));
            
            done();
            
        }, getRandomInt(50, 200)*testisimo.speed);
        
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
};