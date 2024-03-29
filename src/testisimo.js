// TODO: SERVER
// users, companies, projects, read/write/public access
// tests versions
// commit test version - if version conflict (accept theirs/yours, merge)

(function(){
    
    /*
     * GLOBAL ERROR HANDLING
     */
    
    // register global error handlers, catch all errors throw between testisimo instance is created
    var errors = [];
    function addErrorListener(window){
        window.onerror = function (message, file, line, column, error) {
            if(testisimo) testisimo.error(error || message, file, line, column);
            else errors.push({ error:error || message, file:file, line:line, column:column });
        };
    }
    addErrorListener(window);
    
    
    /*
     * GLOBAL AJAX INTERCEPTOR
     */
    
    var pendingRequests = 0;
    var onAjaxDone = [];
    
    function safeOnAjaxDone(){
        if(pendingRequests===0) setTimeout(function(){
            while(onAjaxDone.length) {
                onAjaxDone[0]();
                onAjaxDone.shift();
            }
        }, 100); // ensure there will not be any other requests, wait 100ms
    }
    
    (function(open) {
        XMLHttpRequest.prototype.open = function() {
            pendingRequests++;
            this.addEventListener('readystatechange', function() {
                if(this.readyState === 4) pendingRequests--;
                if(pendingRequests<0) pendingRequests = 0;
                safeOnAjaxDone();
                
            }, false);
            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);
    
    
    /*
     * TESTISIMO CONSTRUCTOR AND DEFAULTS
     */
    
    function Testisimo(){}
    
    Testisimo.prototype.selectedClass = 'testisimo-selected'; // css class of selected elements - adding only outline to be visible
    Testisimo.prototype.minStepWait = 100; // wait between steps
    Testisimo.prototype.minActionWait = 100; // wait on action end, because if it will run actions too fast, user will not be able to see progress
    Testisimo.prototype.waitForElementInterval = 250; // interval to check if element exists in DOM
    Testisimo.prototype.maxWaitForElementAttempts = 12; // sometimes, when testing frameworks like angular or async actions, we need to wait to UI rendering ends, so do some repeated check
    Testisimo.prototype.speed = 1;
    
    Testisimo.prototype.resources = {
        useCDN: true,
        
        fontAwesome: '/3rd-party/font-awesome/css/font-awesome.css',
        fontAwesomeCDN: '//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css',

        bootstrap: '/3rd-party/bootstrap/css/bootstrap.min.css',
        bootstrapCDN: '//maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css',

        angular: '/3rd-party/angular/angular.min.js',
        angularCDN: '//ajax.googleapis.com/ajax/libs/angularjs/1.4.8/angular.min.js'
    };
    
    Testisimo.prototype.iframeId = 'testisimo-iframe';
    
    /*
     * AJAX WAITING LISTENER
     */
    
    Testisimo.prototype.waitForAjaxDone = function(cb){
        onAjaxDone.push(cb);
        safeOnAjaxDone();
    };
    
    /*
     * EVENT EMMITER METHODS
     */
    
    Testisimo.prototype.listeners = { _all:[] };

    Testisimo.prototype.addEventListener = function(eventName, fnc){
        if(arguments.length===1) {
            fnc = arguments[0];
            eventName = '_all';
        }
        this.listeners[ eventName ] = this.listeners[ eventName ] || [];
        this.listeners[ eventName ].push(fnc);
    };

    Testisimo.prototype.removeEventListener = function(eventName, fnc){
        if(arguments.length===1) {
            fnc = arguments[0];
            eventName = '_all';
        }
        this.listeners[ eventName ] = this.listeners[ eventName ] || [];
        var index = this.listeners[ eventName ].indexOf(fnc);
        if(index > -1) this.listeners[ eventName ].splice(index, 1);
    };

    Testisimo.prototype.eventsInterceptor = null;
    Testisimo.prototype.emit = function(eventName, obj){
        if(this.silentMode) return;
        var listeners = this.listeners[ eventName ] || [], i;
        for(i=0;i<listeners.length;i++) {
            if(this.eventsInterceptor) {
                this.eventsInterceptor(eventName, obj, function(eventName, obj){
                    listeners[i](obj);
                });
            }
            else listeners[i](obj);
        }
        var allListeners = this.listeners._all;
        for(i=0;i<allListeners.length;i++) {
            if(this.eventsInterceptor) {
                this.eventsInterceptor(eventName, obj, function(eventName, obj){
                    allListeners[i](eventName, obj);
                });
            }
            else allListeners[i](eventName, obj);
        }
    };

    
    /*
     * DOM METHODS FOR GENERATING UI
     */
    
    Testisimo.prototype.addStyles = function(){
        var styleElm = document.createElement('STYLE');
        styleElm.id = 'testisimo-style';
        styleElm.innerHTML = '.' + this.selectedClass + ' { outline:3px solid orange !important; }'+
            '#testisimo-overlay { '+
            'z-index:9998;position:fixed;top:0px;bottom:0px;left:0px;right:0px;cursor:crosshair;opacity:0.2;' +
            'background: linear-gradient(45deg, rgba(0,0,0,0.0980392) 25%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0.0980392) 75%, rgba(0,0,0,0.0980392) 0), linear-gradient(45deg, rgba(0,0,0,0.0980392) 25%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0.0980392) 75%, rgba(0,0,0,0.0980392) 0);'+
            'background-position: 0 0, 40px 40px;'+
            'background-origin: padding-box;'+
            'background-clip: border-box;'+
            'background-size: 80px 80px;'+
            '}'+
            '#testisimo-container { z-index:9999;position:fixed;width:300px;background-color:#fff;box-shadow:0px 0px 30px 0px rgba(50, 50, 50, 0.75);padding:25px 0px; }'+
            '.testisimo-iframe { border:none;width:100%;height:100%; }' +
            '#testisimo-container-header { height:25px;background-color:#000;cursor:move;position:absolute;top:0;left:0;right:0; }'+
            '#testisimo-container-footer { height:25px;background-color:#000;cursor:row-resize;position:absolute;bottom:0;left:0;right:0; }'+
            '#testisimo-container-overlay { z-index:1;position:absolute;top:0px;left:0px;bottom:0px;right:0px;display:none;cursor:move; }'+
            '#testisimo-container.testisimo-dragged #testisimo-container-overlay { display:block; }'+
            '#testisimo-container-header button { border:none;background-color:transparent;font-size:12px;color:#fff;padding:2px 10px; }'+
            '.testisimo-icon, .testisimo-icon:focus, .testisimo-icon:active { background-repeat:no-repeat;background-position:center;outline:none; }'+
            '.testisimo-icon-pin { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAMAAAAolt3jAAAAYFBMVEUAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDPKpCdAAAAH3RSTlMAAQINGh4pLzY8QEpMVVtnb3CUm6CvvsXKz+bx8/n7jVbynAAAAE9JREFUeAGNx0cWhCAUBMCeQcWcc6Dvf0v1C+/JztoVLg1vW4BHSxHBmkpD5nDG5CDTb/3NlSELO7VSdBA9LS1dXDM4e4y3IfRaK6/6D3ECwWMHu2qhe6cAAAAASUVORK5CYII=);}'+
            '.testisimo-icon-bars { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIVBMVEUAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDcWqnoAAAACnRSTlMAAQIGY2R40dPvH5wsVAAAACdJREFUCFtjYIACZWMQMGSYtQoEljF0gemlDOigCiy+BK4Opo9IcwCKrB8iFAmPNQAAAABJRU5ErkJggg==);}'+
            '.testisimo-icon-caret-up {	background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAMAAAAolt3jAAAAHlBMVEUAAACAgICAgICAgICAgICAgICAgICAgICAgICAgIAAvJH/AAAACXRSTlMAARVkaZKVpc+5VbSfAAAALklEQVR42p3HuREAIBADMR+/+2+YgWQhBGXSh3StuMU5rzO+xvd4NqrUjRF6MQGnCgH5SY+SpgAAAABJRU5ErkJggg==);}'+
            '.testisimo-icon-arrow-left { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAJ1BMVEUAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBjwPSjAAAADHRSTlMAAgQFBwibvMDO0/cbjaSWAAAAIElEQVQIW2NgIATEIBRTDYT2PAMCpxmioDRzD6o6AgAAfkwLa2yaHx8AAAAASUVORK5CYII=);}'+
            '.testisimo-icon-arrow-right { background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAALVBMVEUAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDaI72bAAAADnRSTlMAAgQFBgiVm7e+ytH3+SaT/zIAAAAkSURBVAhbY2AgBhRCFb00YDj3DgS2MtwD00sgEi8UIHQiQcMAVFAPRZn9mbAAAAAASUVORK5CYII=);}';
        document.body.appendChild(styleElm);
    };
    
    var containerElm;
    Testisimo.prototype.addContainer = function(){
        var testisimo = this;
        var dimensions = testisimo.localStore.getOptions();
        containerElm = document.createElement('DIV');
        containerElm.id = 'testisimo-container';
        
        // check if conteiner is not outside visible area
        var maxTop = window.innerHeight - 60;
        var maxLeft = window.innerWidth - 320;
        var top = parseInt(dimensions.top, 10) || 20;
        var left = parseInt(dimensions.left, 10) || 20;
        if(top < 0) top = 20;
        else if(top > maxTop) top = maxTop;
        if(left < 0) left = 20;
        else if(left > maxLeft) left = maxLeft;
        
        containerElm.style.top = top + 'px';
        containerElm.style.left = left + 'px';
        containerElm.style.height = dimensions.height || '500px';
        containerElm.style.position = dimensions.position || 'fixed';
        containerElm.innerHTML = '<div id="testisimo-container-header">' +
                                    '<button class="testisimo-icon testisimo-icon-pin" onmousedown="event.stopPropagation()" onclick="testisimo.container.pin()">&nbsp;</button>' +
                                    '<button class="testisimo-icon testisimo-icon-arrow-left" onmousedown="event.stopPropagation()" onclick="testisimo.container.left()">&nbsp;</button>' +
                                    '<button class="testisimo-icon testisimo-icon-arrow-right" onmousedown="event.stopPropagation()" onclick="testisimo.container.right()">&nbsp;</button>' +
            
                                    '<button class="testisimo-icon testisimo-icon-caret-up" onmousedown="event.stopPropagation()" onclick="testisimo.container.collapse()" style="float:right">&nbsp;</button>' +
                                 '</div>' +
                                 '<iframe id="' +this.iframeId+ '" class="testisimo-iframe"></iframe>' +
                                 '<div id="testisimo-container-footer" class="testisimo-icon testisimo-icon-bars"></div>' +
                                 '<div id="testisimo-container-overlay"></div>';
        document.body.appendChild(containerElm);
        document.getElementById('testisimo-container-header').addEventListener('mousedown', dragStart);
        document.getElementById('testisimo-container-footer').addEventListener('mousedown', dragResizeStart);
        
        var drag = false;
        function dragStart(e){
            e.preventDefault();
            testisimo.toggleClass(containerElm, 'testisimo-dragged');
            containerElm.dragOffsetX = e.clientX - parseInt(containerElm.style.left, 10);
            containerElm.dragOffsetY = e.clientY - parseInt(containerElm.style.top, 10);
            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup', dragStop);
            drag = true;
            return false;
        }
        function dragMove(e){
            if (!drag) return;
            var offsetX = containerElm.dragOffsetX;
            var offsetY = containerElm.dragOffsetY;
            containerElm.style.left = e.clientX - offsetX+'px';
            containerElm.style.top = e.clientY - offsetY+'px';
            return false;
        }
        function dragStop(){
            drag = false;
            testisimo.toggleClass(containerElm, 'testisimo-dragged');
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mousemove', dragResize);
            document.removeEventListener('mouseup', dragStop);
            testisimo.container.updateOpts();
        }
        function dragResizeStart(e){
            e.preventDefault();
            testisimo.toggleClass(containerElm, 'testisimo-dragged');
            containerElm.dragClientY = e.clientY;
            containerElm.dragHeight = parseInt(containerElm.style.height, 10);
            document.addEventListener('mousemove', dragResize);
            document.addEventListener('mouseup', dragStop);
            drag = true;
            return false;
        }
        function dragResize(e){
            if (!drag) return;
            containerElm.style.height = containerElm.dragHeight + e.clientY - containerElm.dragClientY + 'px';
            return false;
        }
    };
    
    Testisimo.prototype.container = {
        updateOpts: function(){
            testisimo.localStore.setOptions({
                top: containerElm.style.top,
                left: containerElm.style.left,
                height: containerElm.style.height,
                position: containerElm.style.position
            });
        },
        pin: function(){
            var isAbsolute = containerElm.style.position==='absolute';
            containerElm.style.top = parseInt(containerElm.style.top,10) + (isAbsolute ? -1 : 1)*document.body.scrollTop + 'px';
            containerElm.style.left = parseInt(containerElm.style.left,10) + (isAbsolute ? -1 : 1)*document.body.scrollLeft + 'px';
            containerElm.style.position = containerElm.style.position==='absolute' ? 'fixed' : 'absolute';
            this.updateOpts();
        },
        left: function(){
            containerElm.style.top = '20px';
            containerElm.style.left = '20px';
            containerElm.style.height = window.innerHeight - 60 + 'px';
            this.updateOpts();
        },
        right: function(){
            containerElm.style.top = '20px';
            containerElm.style.left = window.innerWidth - 320 + 'px';
            containerElm.style.height = window.innerHeight - 60 + 'px';
            this.updateOpts();
        },
        collapse: function(){
            containerElm.style.height = '90px';
            this.updateOpts();
        }
    };

    Testisimo.prototype.getIframe = function(){
        var ifrm = document.getElementById(this.iframeId);
        return (ifrm.contentWindow) ? ifrm.contentWindow : (ifrm.contentDocument.document) ? ifrm.contentDocument.document : ifrm.contentDocument;
    };

    Testisimo.prototype.getAppTemplates = function(){
        var html = '';
        var actions = this.actions;
        for(var key in actions){
            if(actions[key]) html += '<script type="text/ng-template" id="'+key+'">'+actions[key].optsTemplate+'</script>';
        }
        return html;
    };
    
    
    /*
     * DOM METHODS FOR ELEMENTS SELECTION
     */
    
    Testisimo.prototype.addOverlay = function(){
        var overlayElm = document.createElement('DIV');
        overlayElm.id = 'testisimo-overlay';
        document.body.appendChild(overlayElm);
        overlayElm.addEventListener('click', this.overlayClick);
    };

    Testisimo.prototype.getOverlay = function(){
        return document.getElementById('testisimo-overlay');
    };

    Testisimo.prototype.removeOverlay = function(){
        var overlayElm = this.getOverlay();
        overlayElm.removeEventListener('click', this.overlayClick);
        overlayElm.parentElement.removeChild(overlayElm);
    };

    Testisimo.prototype.overlayClick = function(e){
        e.stopPropagation();
        var x = e.x;
        var y = e.y;

        // remove overlay to ensure it will not be targeted
        testisimo.removeOverlay();

        setTimeout(function(){
            var target = document.elementFromPoint(x,y);
            testisimo.clearClass(testisimo.selectedClass);
            testisimo.toggleClass(target, testisimo.selectedClass);
            testisimo.emit('selected',{ tagName:target.tagName, attrs:testisimo.getAttributes(target) });
        }, 0);
    };

    Testisimo.prototype.toggleClass = function(elm, className){
        if(typeof elm.className === 'undefined') return false;
        if(elm.className.indexOf(className) > -1) {
            elm.className = elm.className.replace(' ' + className,'');
            return false;
        }

        elm.className = elm.className + ' ' + className;
        return true;
    };

    Testisimo.prototype.clearClass = function(className){
        var elms = document.querySelectorAll('.'+className);
        for(var i=0;i<elms.length;i++){
            this.toggleClass(elms[i], className);
        }
    };

    Testisimo.prototype.getAttributes = function(elm){
        var attrs = {};
        var elmAttrs = elm.attributes;
        var name;

        if(!elmAttrs) return {};

        for(var i=0;i<elmAttrs.length;i++) {
            name = elmAttrs[i].name;
            attrs[name] = elmAttrs[i].value;
            if(name === 'class') attrs[name] = attrs[name].replace(' testisimo-selected','');
        }
        return attrs;
    };

    Testisimo.prototype.getElementParents = function(elm){
        var parents = [];
        while(elm.parentNode){
            parents.push(elm.parentNode);
            elm = elm.parentNode;
        }
        return parents;
    };
    
    Testisimo.prototype.traverseDOM = function(fnc, parentElm){
        parentElm = parentElm || document;
        var children = parentElm.childNodes;

        for(var i=0;i<children.length;i++) {
            if( fnc(children[i], this.getAttributes(children[i])) || this.traverseDOM(fnc, children[i])) return true;
        }
    };
    
    Testisimo.prototype.escapeRegExp = function(str){
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    };
    
    Testisimo.prototype.selectorRegExp = function(operator, str){
        str = str || '';
        if(operator === '=') return new RegExp('^' +this.escapeRegExp(str)+ '$','g');
        if(operator === '*') return new RegExp('.*' +this.escapeRegExp(str)+ '.*','g');
        if(operator === '~') return new RegExp('([\\s]+|^)(' +this.escapeRegExp(str)+ ')([\\s]+|$)','g');
        if(operator === '|') return new RegExp('([-]+|^)(' +this.escapeRegExp(str)+ ')([-]+|$)','g');
        if(operator === '*') return new RegExp('.*' +this.escapeRegExp(str)+ '.*','g');
        if(operator === '^') return new RegExp('^' +this.escapeRegExp(str)+ '.*','g');
        if(operator === '$') return new RegExp('.*' +this.escapeRegExp(str)+ '$','g');
    };

    Testisimo.prototype.searchDOM = function(selector, matchObj, variables){
        var matched = [], attrs, tagName, matchText, isVisible; // matchAll = false, attributesMatched;
        selector = this.replaceVariables(selector || '', variables);
        
        for(var name in matchObj){
            var operator = ['=','~','|','^','$','*'].indexOf(matchObj[name][0]) > -1 ? matchObj[name][0] : '';
            var value = operator ? matchObj[name].substring(1) : matchObj[name];
            value = this.replaceVariables(value, variables);
            name = this.replaceVariables(name, variables);
            
            if(name==='innerText' || name==='textContent') {
                if(value) matchText = this.selectorRegExp(operator, value);
            }
            else if(name==='isVisible') isVisible = value;
            else if(name==='tagName') selector += value;
            else selector += '[' + name + (operator==='=' ? '' : operator) + '="' + value + '"]';
        }
        
        var list;
        try { list = document.querySelectorAll(selector || '*'); }
        catch(e){ list = []; }
        
        for(var i=0;i<list.length;i++){
            attrs = this.getAttributes(list[i]);
            tagName = list[i].tagName;
            
            if(isVisible || isVisible==='') {
                if(isVisible==='false') { 
                    if(list[i].offsetParent !== null) continue;
                }
                else if(list[i].offsetParent === null) continue;
            }
            
            if(matchText) {
                var text = list[i].innerText || list[i].textContent;
                if(text.match(matchText)) matched.push({ elm:list[i], attrs:attrs, tagName: tagName });
                continue;
            }
            
            matched.push({ elm:list[i], attrs:attrs, tagName: tagName });
        }
        return matched;
    };

    Testisimo.prototype.selectMode = function(){
        this.addOverlay();
    };

    Testisimo.prototype.selectElements = function(selector, matchObj, variables){
        this.clearClass(this.selectedClass);
        var targets = this.searchDOM(selector, matchObj, variables);
        for(var i=0;i<targets.length;i++) this.toggleClass(targets[i].elm, this.selectedClass);
        return targets;
    };
    
    Testisimo.prototype.selectParent = function(selector, matchObj, variables){
        this.clearClass(this.selectedClass);
        var targets = this.searchDOM(selector, matchObj, variables);
        if(!targets[0]) return;
        var parentElm = targets[0].elm.parentNode;
        if(!parentElm) return;
        
        this.toggleClass(parentElm, this.selectedClass);
        return {
            elm: parentElm,
            attrs: this.getAttributes(parentElm),
            tagName: parentElm.tagName
        };
    };
    
    /*
     * INIT METHOD
     */
    
    Testisimo.prototype.init = function(cb, timeout){
        var testisimo = this;
        
        if(['loaded', 'interactive', 'complete'].indexOf(document.readyState) > -1) createElements();
        else window.addEventListener('load', createElements);
        
        function createElements(){
            setTimeout(function(){
                // document.body.style['margin-left'] = '250px';
                testisimo.addStyles();
                testisimo.addContainer();
                var iframe = testisimo.getIframe();

                iframe.testisimo = testisimo;
                iframe.document.open();
                iframe.document.write(testisimo.appHTML());
                iframe.document.close();

                for(var i=0;i<window.frames.length;i++){
                    // may throw exception if iframe is not same origin
                    try {
                        addErrorListener(window.frames[i]); 
                    } 
                    catch(err){ 
                        console.warn('Cannot add Errors Listener to iframe: ' +err.message); 
                    }
                }

                if(errors.length) for(var i=0;i<errors.length;i++) this.error(errors[i].error, errors[i].file, errors[i].line, errors[i].column);
                if(cb) setTimeout(cb, timeout || 0);
            },50);
        }
    };
    
    /*
     * SESSION STORAGE
     */
    
    Testisimo.prototype.sessionStore = {
        get: function(){
            var state = window.sessionStorage.getItem('testisimo:session');
            return state ? JSON.parse(state) : {};
        },
        set: function(state){
            window.sessionStorage.setItem('testisimo:session', JSON.stringify(state));
        }
    };
    
    /*
     * LOCAL STORAGE
     */
    
    Testisimo.prototype.guid = function(){
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    Testisimo.prototype.localStore = {
        // options
        
        getOptions: function(){
            return JSON.parse(window.localStorage.getItem('testisimo:options') || '{}');
        },
        setOptions: function(opts){
            var oldOpts = this.getOptions();
            for(var key in opts) oldOpts[ key ] = opts[ key ];
            window.localStorage.setItem('testisimo:options', JSON.stringify(opts));
        },
        
        // projects
        cache: null,
        stringify: function(value){
            return JSON.stringify(value, function(key, value){
                // ignore all keys that starts with "$"
                if(key[0] === '$') return undefined;
                return value;
            });
        },
        cleanProjects: function(projects){
            var result = {};
            for(var projectId in projects){
                result[projectId] = { name:projects[projectId].name, tests:{} };
                for(var testId in projects[projectId].tests) result[projectId].tests[testId] = { name: projects[projectId].tests[testId].name };
            }
            return result;
        },
        
        // Projects
        
        getProjects: function(){
            if(this.cache) return this.cache;
            var list = window.localStorage.getItem('testisimo:projects') || '{}'; // projectId:{ name:projectName, tests:{'testid1':{name:'test1'},'testid2':{name:'test2'}} }
            var projects = JSON.parse(list);
            for(var projectId in projects){
                projects[projectId].id = projectId;
                for(var testId in projects[projectId].tests) {
                    projects[projectId].tests[testId].id = testId;
                    projects[projectId].tests[testId].projectId = projectId;
                }
            }
            this.cache = projects;
            return this.cache;
        },
        setProject: function(project){
            var list = this.getProjects();
            list[ project.id ] = project;
            window.localStorage.setItem('testisimo:projects', JSON.stringify( this.cleanProjects(list) ));
        },
        createProject: function(name){
            var num = Object.keys( this.getProjects() ).length;
            var newProject = {
                id: testisimo.guid(),
                name: name || 'New Project ' +(num ? num+1 : 1)+ ' (Rename me)',
                tests:{}
            };
            this.setProject(newProject);
            this.createTest(newProject);
            return newProject;
        },
        removeProject: function(projectId){
            projectId = typeof projectId === 'string' ? projectId : projectId.id;
            var list = this.getProjects();
            if(list[projectId]) {
                for(var testId in list[projectId].tests) window.localStorage.removeItem('testisimo:tests:'+testId);
                delete list[projectId];
                window.localStorage.setItem('testisimo:projects', JSON.stringify( this.cleanProjects(list) ));
            }
        },
        getCurrentProject: function(){
            var test = this.getCurrentTest();
            return this.getProjects()[ test.projectId ];
        },
        getFirstProject: function(){
            var projects = this.getProjects();
            return projects[ Object.keys(projects)[0] ];
        },
        exportProjectURL: function(projectId){
            projectId = typeof projectId === 'string' ? projectId : projectId.id;
            var project = this.getProjects()[projectId];
            if(!project) throw new Error('Cannot create export URL, Project with Id "' +projectId+ '" not found');
            var data = {
                id:project.id,
                name:project.name,
                tests:{}
            };
            for(var testId in project.tests) data.tests[testId] = this.getTest(testId);
            return 'data:application/json;charset=utf-8,'+encodeURIComponent( this.stringify(data) );
        },
        importProject: function(jsonData){
            var data;
            try {
                data = JSON.parse(jsonData);
                if(Object.prototype.toString.call(data) !== '[object Object]') return false;
            }
            catch(err){
                return false;
            }
            
            var projects, project, projectId;
            if(typeof data.id === 'string' && 
               typeof data.name === 'string' &&
               Object.prototype.toString.call(data.tests) === '[object Object]'){
                
                // clean up project
                projectId = data.id;
                projects = {};
                projects[projectId] = data;
                project = this.cleanProjects(projects)[projectId];
                project.id = projectId;
                
                // store project
                this.setProject(project);
                for(var testId in project.tests) {
                    if(Object.prototype.toString.call(data.tests[testId]) === '[object Object]'){
                        data.tests[testId].id = testId;
                        data.tests[testId].projectId = projectId;
                        this.setTest(data.tests[testId]);
                    }
                }
            }
            else throw new Error('Cannot import, seems like object is not project');
            
            return true;
        },
        
        // Tests
        
        getFirstTest: function(projectId){
            projectId = typeof projectId === 'string' ? projectId : projectId.id;
            var project = this.getProjects()[projectId];
            if(!project) return;
            return project.tests[ Object.keys(project.tests)[0] ];
        },
        getCurrentTest: function(){
            var current = JSON.parse( window.localStorage.getItem('testisimo:current') || '{}' );
            var projects = this.getProjects();
            var currentProject = projects[current.projectId];
            if(!currentProject){
                currentProject = this.getFirstProject() || this.createProject();
            }
            var currentTest = currentProject.tests[ current.testId ];
            if(!currentTest) {
                currentTest = this.getFirstTest(currentProject) || this.createTest(currentProject);
            }
            return currentTest;
        },
        setCurrentTest: function(test){
            window.localStorage.setItem('testisimo:current', JSON.stringify(test ? { testId:test.id, projectId:test.projectId } : {}));
        },
        getTest: function(testId){
            testId = typeof testId === 'string' ? testId : testId.id;
            var test = window.localStorage.getItem('testisimo:tests:'+testId);
            if(!test) throw new Error('Cannot load Test "' +testId+ '", not found');
            test = JSON.parse(test);
            var project = this.getProjects()[ test.projectId ];
            if(!project) throw new Error('Cannot load Test "' +testId+ '", Project "' +test.projectId+ '" not found');
            project[test.id] = test;
            return test;
        },
        setTest: function(test){
            var project = this.getProjects()[test.projectId];
            if(!project) throw new Error('Cannot create Test, Project with Id "' +test.projectId+ '" not found');
            project.tests[ test.id ] = test;
            this.setProject(project);
            window.localStorage.setItem('testisimo:tests:'+test.id, this.stringify(test));
        },
        createTest: function(projectId){
            projectId = typeof projectId === 'string' ? projectId : projectId.id;
            var project = this.getProjects()[projectId];
            if(!project) throw new Error('Cannot create Test, Project with Id "' +projectId+ '" not found');
            var num = Object.keys(project.tests).length;
            var newTest = {
                id: testisimo.guid(),
                projectId: projectId,
                name: 'New Test ' +(num ? num+1 : 1)+ ' (Rename me)',
                steps:[{
                    selector: '',
                    match: {},
                    actions: []
                }]
            };
            
            this.setTest(newTest);
            return newTest;
        },
        removeTest: function(test){
            var project = this.getProjects()[ test.projectId ];
            this.setCurrentTest(null);
            window.localStorage.removeItem('testisimo:tests:'+test.id);
            if(project && project.tests[ test.id ]){
                delete project.tests[ test.id ];
                this.setProject(project);
                if(Object.keys(project.tests).length === 0) this.createTest(project); // create empty test if last test of project removed
            }
        }
    };
    
    
    /*
     * STEPS EXECUTION
     */
    
    Testisimo.prototype.forceStop = false;
    Testisimo.prototype.runningStepIndex = null;
    Testisimo.prototype.runningActionIndex = null;
    Testisimo.prototype.parentTests = [];
    
    Testisimo.prototype.extractVariableNames = function(str){
        if(!str) return [];
        if(typeof str !== 'string') return [];
        var vars = [];
        str.replace(/\{([^\}\\]+)\}/g, function($1,$2){ vars.push($2); });
        return vars;
    };
    
    Testisimo.prototype.replaceVariables = function(str, variables){
        if(!variables) return str;
        if(!str) return '';
        if(typeof str !== 'string') return '';
        return str.replace(/\{([^\}\\]+)\}/g, function($1,$2){ return (variables[$2]||{}).value||''; }) || '';
    };
    
    Testisimo.prototype.tryFindTargets = function(selector, match, variables, cb, i){
        var testisimo = this;
        i = i || 0;
        if(!selector && (!match || Object.keys(match).length===0)) return cb([]);
        var targets = testisimo.searchDOM(selector, match, variables);
        if(targets.length || i > testisimo.maxWaitForElementAttempts || testisimo.forceStop) return cb(targets);
        
        setTimeout(function(){
            testisimo.tryFindTargets(selector, match, variables, cb, i+1);
        }, testisimo.waitForElementInterval);
    };

    Testisimo.prototype.executeSteps = function(steps, variables, done, index){
        index = index || 0;
        var testisimo = this;
        var step = steps[index];
        variables = variables || {};
        var queue = [];
        var targets = null;
        var position;
        var actionIndex = typeof step.actionIndex === 'number' && step.actionIndex > -1 ? step.actionIndex : 0;
        if(!step) return;
        testisimo.clearClass(this.selectedClass);
        
        if(step.actions.length===0 || actionIndex > step.actions.length-1){
            if(index+1 < steps.length) return testisimo.executeSteps(steps, variables, done, index+1);
            else return done ? done() : null;
        }
        
        for(var i=actionIndex;i<step.actions.length;i++){
            var action = step.actions[i].action;

            if(testisimo.actions[action]) {
                queue.push({
                    actionIndex: i,
                    action: action, 
                    handler: testisimo.actions[action].handler,
                    opts: step.actions[i].opts
                });
            }
            else {
                testisimo.runningStepIndex = null;
                testisimo.runningActionIndex = null;
                var err = new Error('Step "' +((step.index || index)+1)+ '": Action "' +action+ '" not recognized');
                position = { step:(step.index || index), action:i, message:err.message||err };
                testisimo.emit('execError', position);
                return done ? done(err, 'execError', position) : null;
            }
        }

        if(queue.length) execAction();
        else if(done) done();
        
        function execAction(){
            if(testisimo.forceStop) {
                if(!testisimo.parentTests.length) testisimo.forceStop = false;
                if(done) done();
                return;
            }

            testisimo.runningStepIndex = step.index || index;
            testisimo.runningActionIndex = queue[0].actionIndex;
            
            position = { step: step.index || index, action:queue[0].actionIndex };
            testisimo.emit('execStart', position);

            testisimo.waitForAjaxDone(function(){
                if(!targets) {
                    testisimo.tryFindTargets(step.selector, step.match, variables, function(foundTargets){
                        targets = foundTargets;
                        handleAction();
                    });
                }
                else handleAction();
            });
        }
        
        function handleAction(){
            queue[0].handler(targets, queue[0].opts, variables, function(err){
                testisimo.runningStepIndex = null;
                testisimo.runningActionIndex = null;

                if(testisimo.forceStop==='error') return;

                if(err) {
                    position = { step:(step.index || index), action:queue[0].actionIndex, message:err.message||err };
                    testisimo.emit('execError', position);
                    return done ? done(err, 'execError', position) : null;
                }

                setTimeout(function(){
                    position = { step: step.index || index, action:queue[0].actionIndex };
                    testisimo.emit('execEnd', position);
                    queue.shift();
                    if(queue.length) execAction();
                    else if(index+1 < steps.length) testisimo.executeSteps(steps, variables, done, index+1);
                    else if(done) done();
                }, (testisimo.minActionWait+((index+1 < steps.length) ? testisimo.minStepWait : 0))*testisimo.speed);
            });
        }
    };
    
    /*
     * ERROR HANDLING
     */ 
    
    Testisimo.prototype.error = function(error, file, line, column){
        var testisimo = this;
        if(testisimo.runningStep!==null) testisimo.forceStop = 'error';
        testisimo.emit('execError', { 
            step:testisimo.runningStepIndex, 
            action:testisimo.runningActionIndex, 
            message:error.message||error 
        });
        testisimo.runningStepIndex = null;
        testisimo.runningActionIndex = null;
        testisimo.lastError = error.message||error;
    };
    

    /*
     * STEP ACTIONS
     */ 
    Testisimo.prototype.actions = {};
        
    /*
     * TESTISIMO INSTANCE
     */
    window.Testisimo = Testisimo; // publish constructor
    if(typeof window.testisimoConstructor === 'function') window.testisimoConstructor(window.Testisimo);
    
    window.testisimo = new Testisimo(); // publish instance
    if(typeof window.testisimoInstance === 'function') window.testisimoInstance(window.testisimo);
    
    /*
     * INIT
     */
    window.testisimo.init();
    
})();
