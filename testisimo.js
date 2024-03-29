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
// TODO: 
// alert icon on error if container is collapsed
// step notes + icon
// error handler warning when testing angular apps

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
                    '.footer { height:30px; }'+
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
                                                '<button class="btn btn-default btn-sm" ng-click="selectParent(step)" ng-disabled="step.$selectionMode" style="width:30%"><i class="fa fa-level-up"></i> Parent</button>'+
                                                '<button class="btn btn-default btn-sm" ng-click="step.$selectionMode||selectElements(step)" style="width:35%" ng-class="{active:step.$selectionMode}"><i class="fa fa-crosshairs"></i> Pick</button>'+
                                                '<button class="btn btn-default btn-sm" ng-click="showSelectedElements(step)" style="width:35%"><i class="fa fa-eye"></i> Show ({{step.$selectedLength||0}})</button>'+
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
                    '<h5 class="text-center">Testisimo &copy; 2016</h5>'+
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
        function createSelectedCb(step, addVisibleMatch){
            return function(target){
                step.$selector = (target.tagName||'').toLowerCase();
                step.$match = [];
                for(var key in target.attrs) step.$match.push({ name:key, operator:'=', value:target.attrs[key] });
                if(addVisibleMatch) step.$match.push({ name:'isVisible', operator:'=', value:'true' });
                step.$selectionMode = false;
                $scope.updateMatch(step);
            };
        }
        $scope.selectElements = function(step){
            step.$selectionMode = true;

            selectedCb = createSelectedCb(step, true);
            testisimo.selectMode();
        };

        $scope.$on('testisimo:selected', function(e, target){
            $timeout(function(){
                if(selectedCb) selectedCb(target);
                selectedCb = null;
            });
        });
        
        $scope.selectParent = function(step){
            var parent = testisimo.selectParent(step.$selector, $scope.arrayToObjectMatch(step.$match), $scope.test.variables);
            if(parent) {
                createSelectedCb(step, true)(parent);
                $scope.showSelectedElements(step);
            }
        };

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
};/** @license DOM Keyboard Event Level 3 polyfill | @version 0.4.4 | MIT License | github.com/termi */

// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @warning_level VERBOSE
// @jscomp_warning missingProperties
// @output_file_name DOMEventsLevel3.shim.min.js
// @check_types
// ==/ClosureCompiler==
/**
 * @version 0.4
 * TODO::
 * 0. refactoring and JSDoc's
 * 1. Bug fixing:
 *   - FF: char "[" (keyCode:91) or "\"(keyCode:92) for key "OS"
 * 2. repeat property
 * 3. preventDefault for keypress for special keys (Ctrl+c, shift+a, etc) for Opera lt 12.50
 *
 * TODO Links:
 * 1. http://help.dottoro.com/ljlwfxum.php | onkeypress event | keypress event
 * 2. http://api.jquery.com/event.preventDefault/#comment-31391501 | Bug in Opera with keypress
 * 3. http://www.w3.org/TR/DOM-Level-3-Events/#events-keyboard-event-order
 * 4. http://www.quirksmode.org/dom/events/keys.html
 * 5. http://stackoverflow.com/questions/9200589/keypress-malfunction-in-opera
 * 6. http://code.google.com/p/closure-library/source/browse/trunk/closure/goog/events/keyhandler.js
 * 7. http://www.javascripter.net/faq/keycodes.htm
 /*
 http://www.w3.org/TR/DOM-Level-3-Events/#events-KeyboardEvent
 http://dev.w3.org/2006/webapi/DOM-Level-3-Events/html/DOM3-Events.html#events-KeyboardEvent
 */

/*
 http://lists.w3.org/Archives/Public/www-dom/2010JanMar/0062.html
 http://w3c-test.org/webapps/DOMEvents/tests/submissions/Microsoft/converted/EventObject.multiple.dispatchEvent.html
 Test Description: An event object may be properly dispatched multiple times while also allowing to prevent the event objects propagation prior to the event dispatch.
 var evt = document.createEvent("Event");
 evt.initEvent("foo", true, true);
 var el = document.createElement("_");
 var evtCount = 0;
 el.addEventListener(evt.type, function(e){ evtCount++; e.stopPropagation() });
 el.dispatchEvent(evt);
 el.dispatchEvent(evt);
 console.log(evtCount);
 PASS: IE9, FireFox
 FAILS: Chrome, Opera, Safari
*/

// [[[|||---=== GCC DEFINES START ===---|||]]]
/** @define {boolean} */
var __GCC__ECMA_SCRIPT_SHIMS__ = false;
//IF __GCC__ECMA_SCRIPT_SHIMS__ == true [
//TODO::
//]
var __GCC__NEW_KEYBOARD_EVENTS_PROPOSAL__ = true;
//more info: http://lists.w3.org/Archives/Public/www-dom/2012JulSep/0108.html
//]
// [[[|||---=== GCC DEFINES END ===---|||]]]

if( !function( global ) {
	try {
		return (new global["KeyboardEvent"]( "keyup", {"key": "a"} ))["key"] == "a";
	}
	catch ( __e__ ) {
		return false;
	}
}( this ) )void function( ) {

	var global = this

		, _DOM_KEY_LOCATION_STANDARD = 0x00 // Default or unknown location
		, _DOM_KEY_LOCATION_LEFT = 0x01 // e.g. Left Alt key
		, _DOM_KEY_LOCATION_RIGHT = 0x02 // e.g. Right Alt key
		, _DOM_KEY_LOCATION_NUMPAD = 0x03 // e.g. Numpad 0 or +
		, _DOM_KEY_LOCATION_MOBILE = 0x04
		, _DOM_KEY_LOCATION_JOYSTICK = 0x05

		, _Event_prototype = global["Event"].prototype

		, _KeyboardEvent_prototype = global["KeyboardEvent"] && global["KeyboardEvent"].prototype || _Event_prototype

		, _Event_prototype__native_key_getter

		, _Event_prototype__native_char_getter

		, _Event_prototype__native_location_getter

		, _Event_prototype__native_keyCode_getter

		, _Object_defineProperty = Object.defineProperty || function(obj, prop, val) {
			if( "value" in val ) {
				obj[prop] = val["value"];
				return;
			}

			if( "get" in val ) {
				obj.__defineGetter__(prop, val["get"]);
			}
			if( "set" in val ) {
				obj.__defineSetter__(prop, val["set"]);
			}
		}

		, _Object_getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor

		, getObjectPropertyGetter = function( obj, prop ) {
			/* FF throw Error{message: "Illegal operation on WrappedNative prototype object", name: "NS_ERROR_XPC_BAD_OP_ON_WN_PROTO", result: 2153185292}
			 *  when Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, "location")
			 *  so using __lookupGetter__ instead
			 */
			return "__lookupGetter__" in obj ?
				obj.__lookupGetter__( prop ) :
				_Object_getOwnPropertyDescriptor ? (_Object_getOwnPropertyDescriptor( obj, prop ) || {})["get"] : void 0
			;
		}

		, KEYBOARD_EVENTS = {
			"keydown": null,
			"keyup": null,
			"keypress": null
		}
		, UUID = 1
		/** @const @type {string} */
		, _event_handleUUID = "_h_9e2"
		/** @const @type {string} */
		, _event_eventsUUID = "_e_8vj"
		/** @const @type {string} */
		, _shim_event_keyCodeUUID = _event_handleUUID + "__keyCode"

		, _keyboardEvent_properties_dictionary = {
			"char": "",
			"key": "",
			"location": _DOM_KEY_LOCATION_STANDARD,
			"ctrlKey": false,
			"shiftKey": false,
			"altKey": false,
			"metaKey": false,
			"repeat": false,
			"locale": "",

			"detail": 0,
			"bubbles": false,
			"cancelable": false
		}

		/** @const
		 * Opera lt 12.10 has no event.stopImmediatePropagation
		 * */
		, _Event_has_stopImmediatePropagation = "stopImmediatePropagation" in document.createEvent( "Event" )

		/** @const */
		, _Array_slice = Array.prototype.slice

		/** Use native "bind" or unsafe bind for service and performance needs
		 * @const
		 * @param {Object} object
		 * @param {...} var_args
		 * @return {Function} */
		, _unSafeBind = Function.prototype.bind || function( object, var_args ) {
			var __method = this
				, args = _Array_slice.call( arguments, 1 )
			;
			return function() {
				return __method.apply( object, args.concat( _Array_slice.call( arguments ) ) );
			}
		}

		/** @const */
		, _hasOwnProperty = _unSafeBind.call( Function.prototype.call, Object.prototype.hasOwnProperty )

		, _try_initKeyboardEvent = true

		, _getter_KeyboardEvent_location

		, _initKeyboardEvent_type = (function( _createEvent ) {
			try {
				var e = _createEvent.call(document,  "KeyboardEvent" );//Old browsers unsupported "KeyboardEvent"

				e.initKeyboardEvent(
					"keyup" // in DOMString typeArg
					, false // in boolean canBubbleArg
					, false // in boolean cancelableArg
					, global // in views::AbstractView viewArg
					, "+" // [test]in DOMString keyIdentifierArg | webkit event.keyIdentifier | IE9 event.char | IE9 event.key
					, 3 // [test]in unsigned long keyLocationArg | webkit event.keyIdentifier | IE9 event.key | IE9 event.location
					, true // [test]in boolean ctrlKeyArg | webkit event.shiftKey | old webkit event.ctrlKey | IE9 event.modifiersList
					, false // [test]shift | alt
					, true // [test]shift | alt
					, false // meta
					, false // altGraphKey
				);
				return ((e["keyIdentifier"] || e["key"]) == "+" && (e["keyLocation"] || e["location"]) == 3) && (
					e.ctrlKey ?
						e.altKey ? // webkit
							1
							:
							3
						:
						e.shiftKey ?
							2 // webkit
							:
							4 // IE9/IE10
					)
					|| (e["char"] == "+") && 5 //https://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent#initKeyboardEvent()
					|| 9 // FireFox|w3c
				;
			}
			catch ( __e__ ) {
				return 0
			}
		})( document.createEvent )

		, canOverwrite_keyCode

		, canOverwrite_which

		, testKeyboardEvent = function() {
			try {
				return this && new this( "keyup", {"key": "a", "char": "b"} ) || {}
			} catch ( e ) {
				return {}
			}
		}.call( global["KeyboardEvent"] )

		, newKeyboadrEvent_key_property_proposal__getKey_

		, __Property_descriptor__ = {
			"enumerable": false
			, "configurable": true
			, "writable": true
		}
	;

	if( _Object_getOwnPropertyDescriptor ) {//Modern browser
		//IE9 has key property in KeyboardEvent.prototype otherwise Opera has no properties in KeyboardEvent.prototype
		_Event_prototype__native_key_getter = getObjectPropertyGetter( _KeyboardEvent_prototype, "key" ) || getObjectPropertyGetter( testKeyboardEvent, "key" );
		//IE9 has char property in KeyboardEvent.prototype otherwise Opera has no properties in KeyboardEvent.prototype
		_Event_prototype__native_char_getter = getObjectPropertyGetter( _KeyboardEvent_prototype, "char" ) || getObjectPropertyGetter( testKeyboardEvent, "char" );
		//IE9 has location property in KeyboardEvent.prototype otherwise Opera has no properties in KeyboardEvent.prototype
		_Event_prototype__native_location_getter = getObjectPropertyGetter( _KeyboardEvent_prototype, "location" ) || getObjectPropertyGetter( testKeyboardEvent, "location" );
		//IE9 doesn't allow overwrite "keyCode" and "charCode"
		_Event_prototype__native_keyCode_getter = getObjectPropertyGetter( _KeyboardEvent_prototype, "keyCode" );
	}

	/*

	 [OLD key-values-list] https://developer.mozilla.org/en/DOM/KeyboardEvent#Key_names_and_Char_values
	 [key-values-list] http://www.w3.org/TR/DOM-Level-3-Events/#key-values-list

	 Key | Char | Typical Usage (Informative) | Category (Informative)
	 'Attn' |  | The Attention (Attn) key. | General
	 'Apps' |  | Toggle display of available (interactive) application list. | General
	 'Crsel' |  | The Cursor Select (Crsel) key. | General
	 'ExSel' |  | The Extend Selection (ExSel) key. | General
	 'F1' |  | The F1 key, a general purpose function key, as index 1. | General
	 'F2' |  | The F2 key, a general purpose function key, as index 2. | General
	 'F3' |  | The F3 key, a general purpose function key, as index 3. | General
	 'F4' |  | The F4 key, a general purpose function key, as index 4. | General
	 'F5' |  | The F5 key, a general purpose function key, as index 5. | General
	 'F6' |  | The F6 key, a general purpose function key, as index 6. | General
	 'F7' |  | The F7 key, a general purpose function key, as index 7. | General
	 'F8' |  | The F8 key, a general purpose function key, as index 8. | General
	 'F9' |  | The F9 key, a general purpose function key, as index 9. | General
	 'F10' |  | The F10 key, a general purpose function key, as index 10. | General
	 'F11' |  | The F11 key, a general purpose function key, as index 11. | General
	 'F12' |  | The F12 key, a general purpose function key, as index 12. | General
	 'F13' |  | The F13 key, a general purpose function key, as index 13. | General
	 'F14' |  | The F14 key, a general purpose function key, as index 14. | General
	 'F15' |  | The F15 key, a general purpose function key, as index 15. | General
	 'F16' |  | The F16 key, a general purpose function key, as index 16. | General
	 'F17' |  | The F17 key, a general purpose function key, as index 17. | General
	 'F18' |  | The F18 key, a general purpose function key, as index 18. | General
	 'F19' |  | The F19 key, a general purpose function key, as index 19. | General
	 'F20' |  | The F20 key, a general purpose function key, as index 20. | General
	 'F21' |  | The F21 key, a general purpose function key, as index 21. | General
	 'F22' |  | The F22 key, a general purpose function key, as index 22. | General
	 'F23' |  | The F23 key, a general purpose function key, as index 23. | General
	 'F24' |  | The F24 key, a general purpose function key, as index 24. | General
	 'LaunchApplication1' |  | The Start Application One key. | General
	 'LaunchApplication2' |  | The Start Application Two key. | General
	 'LaunchMail' |  | The Start Mail key. | General
	 'List' |  | Toggle display listing of currently available content or programs. | General
	 'Props' |  | The properties (props) key. | General
	 'Soft1' |  | General purpose virtual function key, as index 1. | General
	 'Soft2' |  | General purpose virtual function key, as index 2. | General
	 'Soft3' |  | General purpose virtual function key, as index 3. | General
	 'Soft4' |  | General purpose virtual function key, as index 4. | General
	 'Accept' |  | The Accept (Commit, OK) key. Accept current option or input method sequence conversion. | UI
	 'Again' |  | The Again key, to redo or repeat an action. | UI
	 'Enter' |  | The Enter key, to activate current selection or accept current input. Note: This key value is also used for the 'Return' (Macintosh numpad) key. | UI
	 'Find' |  | The Find key. | UI
	 'Help' |  | Toggle display of help information. | UI
	 'Info' |  | Toggle display of information about currently selected context or media. | UI
	 'Menu' |  | Toggle display of content or system menu, if available. | UI
	 'ScrollLock' |  | The Scroll Lock key, to toggle between scrolling and cursor movement modes. | UI
	 'Execute' |  | The Execute key. | UI
	 'Cancel' | '\u0018' | The Cancel key. | UI
	 'Esc' | '\u001B' | The Escape (Esc) key, to initiate an escape sequence. | UI
	 'Exit' |  | Exit current state or current application (as appropriate). | UI
	 'Zoom' |  | Toggle between full-screen and scaled content, or alter magnification level. | UI
	 'Separator' |  | The Separator key, for context-sensitive text separators. | Character
	 'Spacebar' | '\u0020' | The Space (Spacebar) key (' '). | Character
	 'Add' | '\u002B' | The Add key, or plus sign ('+'). Note: the Add key is usually found on the numeric keypad (e.g., the 10-key) on typical 101-key keyboards and usually requires the 'NumLock' state to be enabled. | Character / Math
	 'Subtract' | '\u2212' | The Subtract key, or minus sign ('−'). Note: the Subtract key is usually found on the numeric keypad (e.g., the 10-key) on typical 101-key keyboards and usually requires the 'NumLock' state to be enabled. | Character / Math
	 'Multiply' | '\u002A' | The Multiply key, or multiplication sign ('*'). Note: the Multiply key is usually found on the numeric keypad (e.g., the 10-key) on typical 101-key keyboards and usually requires the 'NumLock' state to be enabled. Note: This key value can be represented by different characters depending on context, including  '\u002A' (ASTERISK, '*') or '\u00D7' (MULTIPLICATION SIGN, '×'). | Character / Math
	 'Divide' | '\u00F7' | The Divide key, or division sign ('÷'). Note: the Divide key is usually found on the numeric keypad (e.g., the 10-key) on typical 101-key keyboards and usually requires the 'NumLock' state to be enabled. | Character / Math
	 'Equals' | '\u003D' | The Equals key, or equals sign ('='). Note: the Equals key is usually found on the numeric keypad (e.g., the 10-key) on typical 101-key keyboards and usually requires the 'NumLock' state to be enabled. | Character / Math
	 'Decimal' | '\u2396' | The Decimal key, or decimal separator key symbol ('.'). Note: the Decimal key is usually found on the numeric keypad (e.g., the 10-key) on typical 101-key keyboards and usually requires the 'NumLock' state to be enabled. Note: This key value can be represented by different characters due to localization, such as '\u002E' (FULL STOP, '.') or '\u00B7' (MIDDLE DOT, '·'). | Character / Math
	 'BrightnessDown' |  | The Brightness Down key. Typically controls the display brightness. | Device
	 'BrightnessUp' |  | The Brightness Up key. Typically controls the display brightness. | Device
	 'Camera' |  | The Camera key. | Device
	 'Eject' |  | Toggle removable media to eject (open) and insert (close) state. | Device
	 'Power' |  | Toggle power state. Note: Some devices might not expose this key to the operating environment. | Device
	 'PrintScreen' |  | The Print Screen (PrintScrn, SnapShot) key, to initiate print-screen function. | Device
	 'BrowserFavorites' |  | The Browser Favorites key. | Browser
	 'BrowserHome' |  | The Browser Home key, used with keyboard entry, to go to the home page. | Browser
	 'BrowserRefresh' |  | The Browser Refresh key. | Browser
	 'BrowserSearch' |  | The Browser Search key. | Browser
	 'BrowserStop' |  | The Browser Stop key. | Browser
	 'HistoryBack' |  | Navigate to previous content or page in current history. | Browser
	 'HistoryForward' |  | Navigate to next content or page in current history. | Browser
	 'Left' |  | The left arrow key, to navigate or traverse leftward. | Navigation
	 'PageDown' |  | The Page Down key, to scroll down or display next page of content. | Navigation
	 'PageUp' |  | The Page Up key, to scroll up or display previous page of content. | Navigation
	 'Right' |  | The right arrow key, to navigate or traverse rightward. | Navigation
	 'Up' |  | The up arrow key, to navigate or traverse upward. | Navigation
	 'UpLeft' |  | The diagonal up-left arrow key, to navigate or traverse diagonally up and to the left. | Navigation
	 'UpRight' |  | The diagonal up-right arrow key, to navigate or traverse diagonally up and to the right. | Navigation
	 'Down' |  | The down arrow key, to navigate or traverse downward. | Navigation
	 'DownLeft' |  | The diagonal down-left arrow key, to navigate or traverse diagonally down and to the left. | Navigation
	 'DownRight' |  | The diagonal down-right arrow key, to navigate or traverse diagonally down and to the right. | Navigation
	 'Home' |  | The Home key, used with keyboard entry, to go to start of content. | Edit / Navigation
	 'End' |  | The End key, used with keyboard entry to go to the end of content. | Edit / Navigation
	 'Select' |  | The Select key. | Edit / Navigation
	 'Tab' | '\u0009' | The Horizontal Tabulation (Tab) key. | Edit / Navigation
	 'Backspace' | '\u0008' | The Backspace key. | Edit
	 'Clear' |  | The Clear key, for removing current selected input. | Edit
	 'Copy' |  | The Copy key. | Edit
	 'Cut' |  | The Cut key. | Edit
	 'Del' | '\u007F' | The Delete (Del) Key. Note: This key value is also used for the key labeled 'delete' on MacOS keyboards when modified by the 'Fn' key. | Edit
	 'EraseEof' |  | The Erase to End of Field key. This key deletes all characters from the current cursor position to the end of the current field. | Edit
	 'Insert' |  | The Insert (Ins) key, to toggle between text modes for insertion or overtyping. | Edit
	 'Paste' |  | The Paste key. | Edit
	 'Undo' |  | The Undo key. | Edit
	 'DeadGrave' | '\u0300' | The Combining Grave Accent (Greek Varia, Dead Grave) key. | Composition
	 'DeadEacute' | '\u0301' | The Combining Acute Accent (Stress Mark, Greek Oxia, Tonos, Dead Eacute) key. | Composition
	 'DeadCircumflex' | '\u0302' | The Combining Circumflex Accent (Hat, Dead Circumflex) key. | Composition
	 'DeadTilde' | '\u0303' | The Combining Tilde (Dead Tilde) key. | Composition
	 'DeadMacron' | '\u0304' | The Combining Macron (Long, Dead Macron) key. | Composition
	 'DeadBreve' | '\u0306' | The Combining Breve (Short, Dead Breve) key. | Composition
	 'DeadAboveDot' | '\u0307' | The Combining Dot Above (Derivative, Dead Above Dot) key. | Composition
	 'DeadUmlaut' | '\u0308' | The Combining Diaeresis (Double Dot Abode, Umlaut, Greek Dialytika, Double Derivative, Dead Diaeresis) key. | Composition
	 'DeadAboveRing' | '\u030A' | The Combining Ring Above (Dead Above Ring) key. | Composition
	 'DeadDoubleacute' | '\u030B' | The Combining Double Acute Accent (Dead Doubleacute) key. | Composition
	 'DeadCaron' | '\u030C' | The Combining Caron (Hacek, V Above, Dead Caron) key. | Composition
	 'DeadCedilla' | '\u0327' | The Combining Cedilla (Dead Cedilla) key. | Composition
	 'DeadOgonek' | '\u0328' | The Combining Ogonek (Nasal Hook, Dead Ogonek) key. | Composition
	 'DeadIota' | '\u0345' | The Combining Greek Ypogegrammeni (Greek Non-Spacing Iota Below, Iota Subscript, Dead Iota) key. | Composition
	 'DeadVoicedSound' | '\u3099' | The Combining Katakana-Hiragana Voiced Sound Mark (Dead Voiced Sound) key. | Composition
	 'DeadSemivoicedSound' | '\u309A' | The Combining Katakana-Hiragana Semi-Voiced Sound Mark (Dead Semivoiced Sound) key. | Composition
	 'Alphanumeric' |  | The Alphanumeric key. | Modifier
	 'Alt' |  | The Alternative (Alt, Option, Menu) key. Enable alternate modifier function for interpreting concurrent or subsequent keyboard input. Note: This key value is also used for the Apple 'Option' key. | Modifier
	 'AltGraph' |  | The Alt-Graph key. | Modifier
	 'CapsLock' |  | The Caps Lock (Capital) key. Toggle capital character lock function for interpreting subsequent keyboard input event. | Modifier
	 'Control' |  | The Control (Ctrl) key, to enable control modifier function for interpreting concurrent or subsequent keyboard input. | Modifier
	 'Fn' |  | The Function switch (Fn) key. Activating this key simultaneously with another key changes that key's value to an alternate character or function. | Modifier
	 'FnLock' |  | The Function-Lock (FnLock, F-Lock) key. Activating this key switches the mode of the keyboard to changes some keys' values to an alternate character or function.  | Modifier
	 'Meta' |  | The Meta key, to enable meta modifier function for interpreting concurrent or subsequent keyboard input. Note: This key value is also used for the Apple 'Command' key. | Modifier
	 'Process' |  | The Process key. | Modifier
	 'NumLock' |  | The Number Lock key, to toggle numer-pad mode function for interpreting subsequent keyboard input. | Modifier
	 'Shift' |  | The Shift key, to enable shift modifier function for interpreting concurrent or subsequent keyboard input. | Modifier
	 'SymbolLock' |  | The Symbol Lock key. | Modifier
	 'OS' |  | The operating system key (e.g. the "Windows Logo" key). | Modifier
	 'Compose' |  | The Compose key, also known as Multi_key on the X Window System. This key acts in a manner similar to a dead key, triggering a mode where subsequent key presses are combined to produce a different character. | Modifier
	 'AllCandidates' |  | The All Candidates key, to initate the multi-candidate mode. | IME
	 'NextCandidate' |  | The Next Candidate function key. | IME
	 'PreviousCandidate' |  | The Previous Candidate function key. | IME
	 'CodeInput' |  | The Code Input key, to initiate the Code Input mode to allow characters to be entered by their code points. | IME
	 'Convert' |  | The Convert key, to convert the current input method sequence. | IME
	 'Nonconvert' |  | The Nonconvert (Don't Convert) key, to accept current input method sequence without conversion in IMEs. | IME
	 'FinalMode' |  | The Final Mode (Final) key used on some Asian keyboards, to enable the final mode for IMEs. | IME
	 'FullWidth' |  | The Full-Width Characters key. | IME
	 'HalfWidth' |  | The Half-Width Characters key. | IME
	 'ModeChange' |  | The Mode Change key, to toggle between or cycle through input modes of IMEs. | IME
	 'RomanCharacters' |  | The Roman Characters function key, also known as the 'Youngja' or 'Young' key. | IME
	 'HangulMode' |  | The Hangul (Korean characters) Mode key, to toggle between Hangul and English modes. | IME
	 'HanjaMode' |  | The Hanja (Korean characters) Mode key. | IME
	 'JunjaMode' |  | The Junja (Korean characters) Mode key. | IME
	 'Hiragana' |  | The Hiragana (Japanese Kana characters) key. | IME
	 'JapaneseHiragana' |  | The Japanese-Hiragana key. | IME
	 'JapaneseKatakana' |  | The Japanese-Katakana key. | IME
	 'JapaneseRomaji' |  | The Japanese-Romaji key. | IME
	 'KanaMode' |  | The Kana Mode (Kana Lock) key. | IME
	 'KanjiMode' |  | The Kanji (Japanese name for ideographic characters of Chinese origin) Mode key. | IME
	 'Katakana' |  | The Katakana (Japanese Kana characters) key. | IME
	 'AudioFaderFront' |  | Adjust audio fader towards front. | Media
	 'AudioFaderRear' |  | Adjust audio fader towards rear. | Media
	 'AudioBalanceLeft' |  | Adjust audio balance leftward. | Media
	 'AudioBalanceRight' |  | Adjust audio balance rightward. | Media
	 'AudioBassBoostDown' |  | Decrease audio bass boost or cycle down through bass boost states. | Media
	 'AudioBassBoostUp' |  | Increase audio bass boost or cycle up through bass boost states. | Media
	 'AudioMute' |  | Toggle between muted state and prior volume level. | Media
	 'AudioVolumeDown' |  | Decrease audio volume. | Media
	 'AudioVolumeUp' |  | Increase audio volume. | Media
	 'MediaPause' |  | Pause playback, if not paused or stopped; also used with keyboard entry to pause scrolling output. | Media
	 'MediaPlay' |  | Initiate or continue media playback at normal speed, if not currently playing at normal speed. | Media
	 'MediaTrackEnd' |  | Seek to end of media or program. | Media
	 'MediaTrackNext' |  | Seek to next media or program track. | Media
	 'MediaPlayPause' |  | Toggle media between play and pause states. | Media
	 'MediaTrackPrevious' |  | Seek to previous media or program track. | Media
	 'MediaTrackSkip' |  | Skip current content or program. | Media
	 'MediaTrackStart' |  | Seek to start of media or program. | Media
	 'MediaStop' |  | Stop media playing, pausing, forwarding, rewinding, or recording, if not already stopped. | Media
	 'SelectMedia' |  | The Select Media key. | Media
	 'Blue' |  | General purpose color-coded media function key, as index 3. | Media
	 'Brown' |  | General purpose color-coded media function key, as index 5. | Media
	 'ChannelDown' |  | Select next (numerically or logically) lower channel.. | Media
	 'ChannelUp' |  | Select next (numerically or logically) higher channel. | Media
	 'ClearFavorite0' |  | Clear program or content stored as favorite 0. | Media
	 'ClearFavorite1' |  | Clear program or content stored as favorite 1. | Media
	 'ClearFavorite2' |  | Clear program or content stored as favorite 2. | Media
	 'ClearFavorite3' |  | Clear program or content stored as favorite 3. | Media
	 'Dimmer' |  | Adjust brightness of device, or toggle between or cycle through states. | Media
	 'DisplaySwap' |  | Swap video sources. | Media
	 'FastFwd' |  | Initiate or continue forward playback at faster than normal speed, or increase speed if already fast forwarding. | Media
	 'Green' |  | General purpose color-coded media function key, as index 1. | Media
	 'Grey' |  | General purpose color-coded media function key, as index 4. | Media
	 'Guide' |  | Toggle display of program or content guide. | Media
	 'InstantReplay' |  | Toggle instant replay. | Media
	 'MediaLast' |  | Select previously selected channel or media. | Media
	 'Link' |  | Launch linked content, if available and appropriate. | Media
	 'Live' |  | Toggle display listing of currently available live content or programs. | Media
	 'Lock' |  | Lock or unlock current content or program. | Media
	 'NextDay' |  | If guide is active and displayed, then display next day's content. | Media
	 'NextFavoriteChannel' |  | Select next favorite channel (in favorites list). | Media
	 'OnDemand' |  | Access on-demand content or programs. | Media
	 'PinPDown' |  | Move picture-in-picture window downward. | Media
	 'PinPMove' |  | Move picture-in-picture window. | Media
	 'PinPToggle' |  | Toggle display of picture-in-picture window. | Media
	 'PinPUp' |  | Move picture-in-picture window upward. | Media
	 'PlaySpeedDown' |  | Decrease media playback speed. | Media
	 'PlaySpeedReset' |  | Reset playback speed to normal speed (according to current media function). | Media
	 'PlaySpeedUp' |  | Increase media playback speed. | Media
	 'PrevDay' |  | If guide is active and displayed, then display previous day's content. | Media
	 'RandomToggle' |  | Toggle random media or content shuffle mode. | Media
	 'RecallFavorite0' |  | Select (recall) program or content stored as favorite 0. | Media
	 'RecallFavorite1' |  | Select (recall) program or content stored as favorite 1. | Media
	 'RecallFavorite2' |  | Select (recall) program or content stored as favorite 2. | Media
	 'RecallFavorite3' |  | Select (recall) program or content stored as favorite 3. | Media
	 'MediaRecord' |  | Initiate or resume recording of currently selected media. | Media
	 'RecordSpeedNext' |  | Toggle or cycle between media recording speeds (if applicable). | Media
	 'Red' |  | General purpose color-coded media function key, as index 0. | Media
	 'MediaRewind' |  | Initiate or continue reverse playback at faster than normal speed, or increase speed if already rewinding. | Media
	 'RfBypass' |  | Toggle RF (radio frequency) input bypass mode. | Media
	 'ScanChannelsToggle' |  | Toggle scan channels mode. | Media
	 'ScreenModeNext' |  | Advance display screen mode to next available mode. | Media
	 'Settings' |  | Toggle display of device settings screen. | Media
	 'SplitScreenToggle' |  | Toggle split screen mode. | Media
	 'StoreFavorite0' |  | Store current program or content as favorite 0. | Media
	 'StoreFavorite1' |  | Store current program or content as favorite 1. | Media
	 'StoreFavorite2' |  | Store current program or content as favorite 2. | Media
	 'StoreFavorite3' |  | Store current program or content as favorite 3. | Media
	 'Subtitle' |  | Toggle display of subtitles, if available. | Media
	 'AudioSurroundModeNext' |  | Advance surround audio mode to next available mode. | Media
	 'Teletext' |  | Toggle display of teletext, if available. | Media
	 'VideoModeNext' |  | Advance video mode to next available mode. | Media
	 'DisplayWide' |  | Toggle device display mode between wide aspect and normal aspect mode. | Media
	 'Wink' |  | Cause device to identify itself in some manner, e.g., audibly or visibly. | Media
	 'Yellow' |  | General purpose color-coded media function key, as index 2. | Media
	 'Unidentified' |  | This key value is used when an implementations is unable to identify another key value, due to either hardware, platform, or software constraints. | Special
	 */

	var
	/**
	 *Key map based on http://calormen.com/polyfill/keyboard.js
	 * @const
	 */
		VK__NON_CHARACTER_KEYS = {
			3: 'Cancel', // char \x0018 ???
			6: 'Help', // ???
			8: 'Backspace',
			9: 'Tab',
			12: 'Clear', // NumPad Center
			13: 'Enter',

			16: 'Shift',
			17: 'Control',
			18: 'Alt',
			19: 'Pause', // TODO:: not in [key-values-list], but usefull
			20: 'CapsLock',

			21: 'KanaMode', // IME
			22: 'HangulMode', // IME
			23: 'JunjaMode', // IME
			24: 'FinalMode', // IME
			25: 'HanjaMode', // IME
			//  0x19: 'KanjiMode', keyLocation: _KeyboardEvent.DOM_KEY_LOCATION_STANDARD, // IME; duplicate on Windows

			27: 'Esc',

			28: 'Convert', // IME
			29: 'Nonconvert', // IME
			30: 'Accept', // IME
			31: 'ModeChange', // IME

			32: 'Spacebar',
			33: 'PageUp',
			34: 'PageDown',
			35: 'End',
			36: 'Home',
			37: 'Left',
			38: 'Up',
			39: 'Right',
			40: 'Down',
			41: 'Select',
			//42: 'Print', // ??? not in [key-values-list]
			43: 'Execute',
			44: 'PrintScreen',
			45: 'Insert',
			46: 'Del',
			47: 'Help', // ???

			91: { _key: 'OS', _char: false, _location: _DOM_KEY_LOCATION_LEFT }, // Left Windows
			92: { _key: 'OS', _char: false, _location: _DOM_KEY_LOCATION_RIGHT }, // Right Windows
			93: 'Menu', // 'Context Menu' from [OLD key-values-list]

			// TODO: Test in WebKit
			106: { _key: 'Multiply', _char: '*', _location: _DOM_KEY_LOCATION_NUMPAD }, // or 'Asterisk' ?
			107: { _key: 'Add', _char: '+', _location: _DOM_KEY_LOCATION_NUMPAD },
			108: { _key: 'Separator', _char: false, _location: _DOM_KEY_LOCATION_NUMPAD }, // ??? NumPad Enter ???
			109: { _key: 'Subtract', _char: '-', _location: _DOM_KEY_LOCATION_NUMPAD },
			110: { _key: 'Decimal', _char: '.', _location: _DOM_KEY_LOCATION_NUMPAD },
			111: { _key: 'Divide', _char: '/'/* TODO:: or '\u00F7' */, _location: _DOM_KEY_LOCATION_NUMPAD },

			// TODO: Test in WebKit
			144: { _key: 'NumLock', _char: false, _location: _DOM_KEY_LOCATION_NUMPAD },
			145: 'ScrollLock',

			// NOTE: Not exposed to browsers so we don't need this
			/*
			 0xA0: { _key : 'Shift', _char: false, _location: _DOM_KEY_LOCATION_LEFT },
			 0xA1: { _key : 'Shift', _char: false, _location: _DOM_KEY_LOCATION_RIGHT },
			 0xA2: { _key : 'Control', _char: false, _location: _DOM_KEY_LOCATION_LEFT },
			 0xA3: { _key : 'Control', _char: false, _location: _DOM_KEY_LOCATION_RIGHT },
			 0xA4: { _key : 'Alt', _char: false, _location: _DOM_KEY_LOCATION_LEFT },
			 0xA5: { _key : 'Alt', _char: false, _location: _DOM_KEY_LOCATION_RIGHT },
			 */

			180: 'LaunchMail',
			181: 'SelectMedia',
			182: 'LaunchApplication1',
			183: 'LaunchApplication2',

			// TODO: Check keyIdentifier in WebKit
			224: 'Meta', // Apple Command key
			229: 'Process', // IME

			246: 'Attn',
			247: 'Crsel',
			248: 'Exsel',
			249: 'EraseEof',
			251: 'Zoom',
			254: 'Clear'
		}
		, VK__CHARACTER_KEYS__DOWN_UP = __GCC__NEW_KEYBOARD_EVENTS_PROPOSAL__ ?
		{
			186: ';'// 'ж', ';', ':'
			, 187: '='
			, 188: ','// 'б', ',', '<'
			, 189: '-'
			, 190: '.'// 'ю', '.', '>'
			, 191: '/'// '.', '/', '?'
			, 192: '`'// 'ё', '`', '~'
			, 219: '['// 'х', '[', '{'
			, 220: '\\'//'\', '\', '|'
			, 221: ']'// 'ъ', '[', '{'
			, 222: "'"// 'э', '"', '''
			, 226: '\\'// '\', '|', '/'
		}
		: { }
		, _userAgent_ = global.navigator.userAgent.toLowerCase()
		, _IS_MAC = !!~(global.navigator.platform + "").indexOf( "Mac" )
		, _BROWSER = {}
		, __i
		/** @type {boolean} */
		, IS_NEED_KEYCODE_BUGFIX
		/** @type {boolean} */
		, IS_OPERA_DOUBBLE_KEYPRESS_BUG
		, tmp
		/** @const @type {number} */
		, _KEYPRESS_VK__CHARACTER_KEYS__DOWN_UP_DELTA = 999
	;

	for( __i = 105 ; __i > 95 ; --__i ) {
		//0, 1, 2 ... 9
		tmp = __i - 96;
		VK__CHARACTER_KEYS__DOWN_UP[tmp + 48] = _Event_prototype__native_key_getter ? tmp + "" : {_key : tmp + ""};//48, 49, 50 ... 57

		//0-9 on Numpad
		VK__CHARACTER_KEYS__DOWN_UP[__i] = { _key: tmp + "", _location: _DOM_KEY_LOCATION_NUMPAD };//96, 97, 98 .. 105
	}

	if( !_Event_prototype__native_key_getter ) {
		for(__i in VK__CHARACTER_KEYS__DOWN_UP) if(_hasOwnProperty(VK__CHARACTER_KEYS__DOWN_UP, __i) && typeof(VK__CHARACTER_KEYS__DOWN_UP[__i]) != "object") {
			VK__CHARACTER_KEYS__DOWN_UP[__i] = {_key: VK__CHARACTER_KEYS__DOWN_UP[__i]};
		}
	}

	// 0x70 ~ 0x87: 'F1' ~ 'F24'
	for( __i = 135 ; __i > 111 ; --__i ) {
		VK__NON_CHARACTER_KEYS[__i] = "F" + (__i - 111);
	}

	if( global["opera"] ) {// Opera special cases
		if( !_Event_prototype__native_char_getter ) {
			//TODO: for Win only?
			IS_NEED_KEYCODE_BUGFIX = true;
			IS_OPERA_DOUBBLE_KEYPRESS_BUG = true;//TODO:: avoid Opera double keypress bug

			/*
			 VK__NON_CHARACTER_KEYS[43] = VK__NON_CHARACTER_KEYS[0x6B];	// key:'Add', char:'+'
			 VK__NON_CHARACTER_KEYS[43]._keyCode = 107;
			 VK__NON_CHARACTER_KEYS[43]._needkeypress = true;	// instead of _key: 0
			 VK__NON_CHARACTER_KEYS[45] = VK__NON_CHARACTER_KEYS[0x6D];	// key:'Subtract', char:'-'
			 VK__NON_CHARACTER_KEYS[45]._keyCode = 109;
			 VK__NON_CHARACTER_KEYS[45]._needkeypress = true;	// instead of _key: 0
			 */
			VK__NON_CHARACTER_KEYS[57351] = VK__NON_CHARACTER_KEYS[93];	//'Menu'
			VK__CHARACTER_KEYS__DOWN_UP[187] = VK__CHARACTER_KEYS__DOWN_UP[61] = {_key: 0, _keyCode: 187};	//'=' (US Standard ? need to ckeck it out)
			VK__CHARACTER_KEYS__DOWN_UP[189] = VK__CHARACTER_KEYS__DOWN_UP[109] = {_key: 0, _keyCode: 189/*not for 187 keyCode, but for 109 */, _location: 3};//TODO: location=3 only for win? //'-' (US Standard ? need to ckeck it out)
			/*
			 Unusable for Opera due to key '[' has keyCode=219 and key '\' has keyCode=220
			 TODO: filtering by keypress event. 'OS' key has no keypress event
			 (VK__NON_CHARACTER_KEYS[219] = VK__NON_CHARACTER_KEYS[0x5B])._keyCode = 91;
			 (VK__NON_CHARACTER_KEYS[220] = VK__NON_CHARACTER_KEYS[0x5C])._keyCode = 92;
			 */

			if( _IS_MAC ) {
				/*TODO::
				 0x11: { keyIdentifier: 'Meta' },
				 0xE030: { keyIdentifier: 'Control' }
				 */
			}
		}
	}
	else {
		//browser sniffing
		_BROWSER["names"] = _userAgent_.match( /(mozilla|compatible|chrome|webkit|safari)/gi );
		__i = _BROWSER["names"] && _BROWSER["names"].length || 0;
		while( __i-- > 0 )_BROWSER[_BROWSER["names"][__i]] = true;

		if( _BROWSER["mozilla"] && !_BROWSER["compatible"] && !_BROWSER["webkit"] ) {// Mozilla special cases
			//TODO:: only Windows?
			IS_NEED_KEYCODE_BUGFIX = true;

			//Firefox version
			_BROWSER._version = +(_userAgent_.match( /firefox\/([0-9]+)/ ) || [])[1];

			tmp = VK__CHARACTER_KEYS__DOWN_UP[61] = VK__CHARACTER_KEYS__DOWN_UP[187];//US Standard
			tmp._keyCode = 187;
			tmp = VK__CHARACTER_KEYS__DOWN_UP[173] = VK__CHARACTER_KEYS__DOWN_UP[189];//US Standard
			tmp._keyCode = 189;
			tmp = VK__CHARACTER_KEYS__DOWN_UP[59] = VK__CHARACTER_KEYS__DOWN_UP[186];//US Standard
			tmp._keyCode = 186;
			if( _BROWSER._version < 15 ) {
				VK__NON_CHARACTER_KEYS[107] = VK__NON_CHARACTER_KEYS[61];
				VK__CHARACTER_KEYS__DOWN_UP[109] = VK__CHARACTER_KEYS__DOWN_UP[173];

				//Can't handle Subtract(key="-",location="3") and Add(key="+",location="3") keys in FF < 15
			}
		}
		else if( _BROWSER["safari"] && !_BROWSER["chrome"] ) {// Safari WebKit special cases
			/*TODO::
			 0x03: { keyIdentifier: 'Enter', keyName: 'Enter', keyChar: '\u000D' }, // old Safari
			 0x0A: { keyIdentifier: 'Enter', keyName: 'Enter', keyLocation: KeyboardEvent.DOM_KEY_LOCATION_MOBILE, keyChar: '\u000D' }, // iOS
			 0x19: { keyIdentifier: 'U+0009', keyName: 'Tab', keyChar: '\u0009'} // old Safari for Shift+Tab
			 */
			if( _IS_MAC ) {
				/*
				 0x5B: { keyIdentifier: 'Meta', keyLocation: KeyboardEvent.DOM_KEY_LOCATION_LEFT },
				 0x5D: { keyIdentifier: 'Meta', keyLocation: KeyboardEvent.DOM_KEY_LOCATION_RIGHT },
				 0xE5: { keyIdentifier: 'U+0051', keyName: 'Q', keyChar: 'Q'} // On alternate presses, Ctrl+Q sends this
				 */
			}
		}
		else if( _BROWSER["chrome"] ) {// Chrome WebKit special cases
			if( _IS_MAC ) {
				/*TODO::
				 0x5B: { keyIdentifier: 'Meta', keyLocation: KeyboardEvent.DOM_KEY_LOCATION_LEFT },
				 0x5D: { keyIdentifier: 'Meta', keyLocation: KeyboardEvent.DOM_KEY_LOCATION_RIGHT }
				 */
			}
		}
	}

	var VK__FAILED_KEYIDENTIFIER = {//webkit 'keyIdentifier' or Opera12.10/IE9 'key'
		//keyIdentifier.substring( 0, 2 ) !== "U+"
		//'U+0008': null, // -> 'Backspace'
		//'U+0009': null, // -> 'Tab'
		//'U+0020': null, // -> 'Spacebar'
		//'U+007F': null, // -> 'Del'
		//'U+0010': null, // [test this] -> 'Fn' ?? 'Function' ?
		//'U+001C': null, // [test this] -> 'Left'
		//'U+001D': null, // [test this] -> 'Right'
		//'U+001E': null, // [test this] -> 'Up'
		//'U+001F': null, // [test this] -> 'Down'

		'Escape': null, // from [OLD key-values-list] -> 'Esc'
		'Win': null, // from [OLD key-values-list] -> 'OS'
		'Scroll': null, // from [OLD key-values-list] -> 'ScrollLock'
		'Apps': null, // from [OLD key-values-list] -> 'Menu'

		//From Opera impl
		'Delete': null, // from [OLD key-values-list] -> 'Del'
		'Window': null, // from [OLD key-values-list] -> 'OS'
		'ContextMenu': null, // from [OLD key-values-list] -> 'Menu'
		'Mul': null // from [OLD key-values-list] -> 'Multiply'
		/*
		 0xAD: 'VolumeMute',
		 0xAE: 'VolumeDown',
		 0xAF: 'VolumeUp',
		 0xB0: 'MediaNextTrack',
		 0xB1: 'MediaPreviousTrack',
		 0xB2: 'MediaStop',
		 0xB3: 'MediaPlayPause',
		 */

		/*
		 0xA6: 'BrowserBack',
		 0xA7: 'BrowserForward',
		 0xA8: 'BrowserRefresh',
		 0xA9: 'BrowserStop',
		 0xAA: 'BrowserSearch',
		 0xAB: 'BrowserFavorites',
		 0xAC: 'BrowserHome',
		 */

		/*
		 0xFA: 'Play',
		 */
	};

// NOTE: 'char' is the default character for that key, and doesn't reflect modifier
// states. It is primarily used here to indicate that this is a non-special key
// BUGS:
// do we need some kind of detection ?
	/*TODO::
	 VK_SPECIAL = {
	 // Mozilla special cases
	 'moz': {
	 0x3B: 'U+00BA', keyName: 'Semicolon', keyChar: ';', _shiftChar: ':', // ; : (US Standard)
	 0x3D: 'U+00BB', keyName: 'Equals', keyChar: '=', _shiftChar: '+', // = +
	 0x6B: 'U+00BB', keyName: 'Equals', keyChar: '=', _shiftChar: '+', // = +
	 0x6D: 'U+00BD', keyName: 'Minus', keyChar: '-', _shiftChar: '_', // - _
	 // TODO: Check keyIdentifier in WebKit for numpad
	 0xBB: 'Add', keyName: 'Add', keyLocation: _DOM_KEY_LOCATION_NUMPAD, keyChar: '+',
	 0xBD: 'Subtract', keyName: 'Subtract', keyLocation: _DOM_KEY_LOCATION_NUMPAD, keyChar: '-' }
	 },

	 // Chrome WebKit special cases
	 'chrome': {
	 },
	 'chrome-mac': {
	 0x5B: 'Meta', keyLocation: _DOM_KEY_LOCATION_LEFT,
	 0x5D: 'Meta', keyLocation: _DOM_KEY_LOCATION_RIGHT }
	 },


	 // Safari WebKit special cases
	 'safari': {
	 0x03: 'Enter', _keyCode: 13, keyName: 'Enter', keyChar: '\u000D', // old Safari
	 0x0A: 'Enter', _keyCode: 13, keyName: 'Enter', keyLocation: _KeyboardEvent.DOM_KEY_LOCATION_MOBILE, keyChar: '\u000D', // iOS
	 0x19: 'Tab', _keyCode: 9, keyName: 'Tab', keyChar: '\u0009'} // old Safari for Shift+Tab
	 },
	 'safari-mac': {
	 0x5B: 'Meta', keyLocation: _DOM_KEY_LOCATION_LEFT,
	 0x5D: 'Meta', keyLocation: _DOM_KEY_LOCATION_RIGHT,
	 0xE5: 'U+0051', keyName: 'Q', keyChar: 'Q'} // On alternate presses, Ctrl+Q sends this
	 },

	 // Opera special cases
	 'opera': {
	 // NOTE: several of these collide in theory, but most other keys are unrepresented
	 [true,cant prevent in input]0x2F: 'Divide', _keyCode: 111, keyName: 'Divide', keyLocation: _DOM_KEY_LOCATION_NUMPAD, keyChar: '/', // Same as 'Help'
	 [true,cant prevent in input]0x2A: 'Multiply', _keyCode: 106, keyName: 'Multiply', keyLocation: _DOM_KEY_LOCATION_NUMPAD, keyChar: '*', // Same as 'Print'
	 [true,cant prevent in input]//0x2D: 'Subtract', keyName: 'Subtract', _ keyCode: 109, keyLocation: _DOM_KEY_LOCATION_NUMPAD,   keyChar: '-', // Same as 'Insert'
	 [true,cant prevent in input]0x2B: 'Add', keyName: 'Add', _ keyCode: 107, keyLocation: _DOM_KEY_LOCATION_NUMPAD, keyChar: '+', // Same as 'Execute'

	 [true]0x3B: 'U+00BA', _keyCode: 186, keyName: 'Semicolon', keyChar: ';', _shiftChar: '', // ; : (US Standard)
	 [true]0x3D: 'U+00BB', _keyCode: 187, keyName: 'Equals', keyChar: '=', _shiftChar: '', // = +

	 [no need]0x6D: 'U+00BD', keyName: 'Minus', keyChar: '-', _shiftChar: '_'} // - _
	 },
	 'opera-mac': {
	 0x11: 'Meta',
	 0xE030: 'Control' }
	 }
	 };
	 */


	/**
	 * http://html5labs.interoperabilitybridges.com/dom4events/#constructors-keyboardevent
	 * http://www.w3.org/TR/DOM-Level-3-Events/#idl-interface-KeyboardEvent-initializers
	 * https://www.w3.org/Bugs/Public/show_bug.cgi?id=14052
	 * @constructor
	 * @param {string} type
	 * @param {Object=} dict
	 */
	function _KeyboardEvent ( type, dict ) {// KeyboardEvent  constructor
		var e;
		try {
			e = document.createEvent( "KeyboardEvent" );
		}
		catch ( err ) {
			e = document.createEvent( "Event" );
		}

		dict = dict || {};

		var localDict = {}
			, _prop_name
			, _prop_value
		;

		for( _prop_name in _keyboardEvent_properties_dictionary )if( _hasOwnProperty( _keyboardEvent_properties_dictionary, _prop_name ) ) {
			localDict[_prop_name] = _prop_name in dict && (_prop_value = dict[_prop_name]) !== void 0 ?
				_prop_value
				:
				_keyboardEvent_properties_dictionary[_prop_name]
			;
		}

		var _ctrlKey = localDict["ctrlKey"] || false
			, _shiftKey = localDict["shiftKey"] || false
			, _altKey = localDict["altKey"] || false
			, _metaKey = localDict["metaKey"] || false
			, _altGraphKey = localDict["altGraphKey"] || false

			, modifiersListArg = _initKeyboardEvent_type > 3 ? (
					(_ctrlKey ? "Control" : "")
					+ (_shiftKey ? " Shift" : "")
					+ (_altKey ? " Alt" : "")
					+ (_metaKey ? " Meta" : "")
					+ (_altGraphKey ? " AltGraph" : "")
				).trim() : null

			, _key = (localDict["key"] || "") + ""
			, _char = (localDict["char"] || "") + ""
			, _location = localDict["location"]
			, _keyCode = _key && _key.charCodeAt( 0 ) || 0 //TODO:: more powerfull key to charCode

			, _bubbles = localDict["bubbles"]
			, _cancelable = localDict["cancelable"]

			, _repeat = localDict["repeat"]
			, _locale = localDict["locale"]

			, success_init = false
		;

		_keyCode = localDict["keyCode"] = localDict["keyCode"] || _keyCode;
		localDict["which"] = localDict["which"] || _keyCode;

		if( !canOverwrite_keyCode ) {//IE9
			e["__keyCode"] = _keyCode;
			e["__charCode"] = _keyCode;
			e["__which"] = _keyCode;
		}


		if( "initKeyEvent" in e ) {//FF
			//https://developer.mozilla.org/en/DOM/event.initKeyEvent

			e.initKeyEvent( type, _bubbles, _cancelable, global,
				_ctrlKey, _altKey, _shiftKey, _metaKey, _keyCode, _keyCode );
			success_init = true;
		}
		else if( "initKeyboardEvent" in e ) {
			//https://developer.mozilla.org/en/DOM/KeyboardEvent#initKeyboardEvent()

			if( _try_initKeyboardEvent ) {
				try {
					if( _initKeyboardEvent_type == 1 ) { // webkit
						/*
						 http://stackoverflow.com/a/8490774/1437207
						 For Webkit-based browsers (Safari/Chrome), the event initialization call should look a bit differently (see https://bugs.webkit.org/show_bug.cgi?id=13368):
						 initKeyboardEvent(
						 in DOMString typeArg,
						 in boolean canBubbleArg,
						 in boolean cancelableArg,
						 in views::AbstractView viewArg,
						 in DOMString keyIdentifierArg,
						 in unsigned long keyLocationArg,
						 in boolean ctrlKeyArg,
						 in boolean shiftKeyArg,
						 in boolean altKeyArg,
						 in boolean metaKeyArg,
						 in boolean altGraphKeyArg
						 );
						 */
						e.initKeyboardEvent( type, _bubbles, _cancelable, global, _key, _location, _ctrlKey, _shiftKey, _altKey, _metaKey, _altGraphKey );
						e["__char"] = _char;
					}
					else if( _initKeyboardEvent_type == 2 ) { // old webkit
						/*
						 http://code.google.com/p/chromium/issues/detail?id=52408
						 event.initKeyboardEvent(
						 "keypress",        //  in DOMString typeArg,
						 true,             //  in boolean canBubbleArg,
						 true,             //  in boolean cancelableArg,
						 null,             //  in nsIDOMAbstractView viewArg,  Specifies UIEvent.view. This value may be null.
						 false,            //  in boolean ctrlKeyArg,
						 false,            //  in boolean altKeyArg,
						 false,            //  in boolean shiftKeyArg,
						 false,            //  in boolean metaKeyArg,
						 13,              //  in unsigned long keyCodeArg,
						 0                //  in unsigned long charCodeArg
						 );
						 */
						e.initKeyboardEvent( type, _bubbles, _cancelable, global, _ctrlKey, _altKey, _shiftKey, _metaKey, _keyCode, _keyCode );
					}
					else if( _initKeyboardEvent_type == 3 ) { // webkit
						/*
						 initKeyboardEvent(
						 type,
						 canBubble,
						 cancelable,
						 view,
						 keyIdentifier,
						 keyLocationA,
						 ctrlKey,
						 altKey,
						 shiftKey,
						 metaKey,
						 altGraphKey
						 );
						 */
						e.initKeyboardEvent( type, _bubbles, _cancelable, global, _key, _location, _ctrlKey, _altKey, _shiftKey, _metaKey, _altGraphKey );
						e["__char"] = _char;
					}
					else if( _initKeyboardEvent_type == 4 ) { // IE9
						/*
						 http://msdn.microsoft.com/en-us/library/ie/ff975297(v=vs.85).aspx
						 eventType [in] Type: BSTR One of the following values, or a user-defined custom event type: keydown,keypress,keyup
						 canBubble [in] Type: VARIANT_BOOL
						 cancelable [in] Type: VARIANT_BOOL
						 viewArg [in] Type: IHTMLWindow2 The active window object or null. This value is returned in the view property of the event.
						 keyArg [in] Type: BSTR The key identifier. This value is returned in the key property of the event.
						 locationArg [in] Type: unsigned long The location of the key on the device. This value is returned in the location property of the event.
						 modifiersListArg [in] Type: BSTR A space-separated list of any of the following values: Alt,AltGraph,CapsLock,Control,Meta,NumLock,Scroll,Shift,Win
						 repeat [in] Type: VARIANT_BOOL The number of times this key has been pressed. This value is returned in the repeat property of the event.
						 locale [in] Type: BSTR The locale name. This value is returned in the locale attribute of the event.
						 */
						e.initKeyboardEvent( type, _bubbles, _cancelable, global, _key, _location, modifiersListArg, _repeat, _locale );
						e["__char"] = _char;
					}
					else if( _initKeyboardEvent_type == 5 ) { // FireFox|w3c
						/*
						 http://www.w3.org/TR/DOM-Level-3-Events/#events-KeyboardEvent-initKeyboardEvent
						 https://developer.mozilla.org/en/DOM/KeyboardEvent#initKeyboardEvent()
						 void initKeyboardEvent(
						 in DOMString typeArg,
						 in boolean canBubbleArg,
						 in boolean cancelableArg,
						 in views::AbstractView viewArg,
						 in DOMString charArg,
						 in DOMString keyArg,
						 in unsigned long locationArg,
						 in DOMString modifiersListArg,
						 in boolean repeat,
						 in DOMString localeArg
						 );
						 */
						e.initKeyboardEvent( type, _bubbles, _cancelable, global, _char, _key, _location, modifiersListArg, _repeat, _locale );
					}
					else { // w3c TODO:: test for browsers that implement it
						/*
						 http://docs.webplatform.org/wiki/dom/methods/initKeyboardEvent
						 initKeyboardEvent(
						 eventType
						 canBubble
						 cancelable
						 view
						 key
						 location
						 modifiersList
						 repeat
						 locale);
						 */
						e.initKeyboardEvent( type, _bubbles, _cancelable, global, _key, _location, modifiersListArg, _repeat, _locale );
					}
					success_init = true;
				}
				catch ( __e__ ) {
					_try_initKeyboardEvent = false;
				}
			}
		}


		if( !success_init ) {
			e.initEvent( type, _bubbles, _cancelable, global );
			e["__char"] = _char;
			e["__key"] = _key;
			e["__location"] = _location;
		}

		for( _prop_name in _keyboardEvent_properties_dictionary )if( _hasOwnProperty( _keyboardEvent_properties_dictionary, _prop_name ) ) {
			if( e[_prop_name] != localDict[_prop_name] ) {
				delete e[_prop_name];
				_Object_defineProperty( e, _prop_name, { writable: true, "value": localDict[_prop_name] } );
			}
		}

		if( !("isTrusted" in e) )e.isTrusted = false;

		return e;
	}

	_KeyboardEvent["DOM_KEY_LOCATION_STANDARD"] = _DOM_KEY_LOCATION_STANDARD; // Default or unknown location
	_KeyboardEvent["DOM_KEY_LOCATION_LEFT"] = _DOM_KEY_LOCATION_LEFT; // e.g. Left Alt key
	_KeyboardEvent["DOM_KEY_LOCATION_RIGHT"] = _DOM_KEY_LOCATION_RIGHT; // e.g. Right Alt key
	_KeyboardEvent["DOM_KEY_LOCATION_NUMPAD"] = _DOM_KEY_LOCATION_NUMPAD; // e.g. Numpad 0 or +
	_KeyboardEvent["DOM_KEY_LOCATION_MOBILE"] = _DOM_KEY_LOCATION_MOBILE;
	_KeyboardEvent["DOM_KEY_LOCATION_JOYSTICK"] = _DOM_KEY_LOCATION_JOYSTICK;
	_KeyboardEvent.prototype = _KeyboardEvent_prototype;

	tmp = new _KeyboardEvent( "keyup" );

	try {
		delete tmp["keyCode"];
		_Object_defineProperty( tmp, "keyCode", { "writable": true, "value": 9 } );
		delete tmp["which"];
		_Object_defineProperty( tmp, "which", { "writable": true, "value": 9 } );
	}
	catch(e){}

	canOverwrite_which = tmp.which === 9;

	if( !(canOverwrite_keyCode = tmp.keyCode == 9) && _Event_prototype__native_keyCode_getter ) {
		_Object_defineProperty( _KeyboardEvent_prototype, "keyCode", {
			"enumerable": true,
			"configurable": true,
			"get": function() {
				if( "__keyCode" in this )return this["__keyCode"];

				return _Event_prototype__native_keyCode_getter.call( this );
			},
			"set": function( newValue ) {
				return this["__keyCode"] = isNaN( newValue ) ? 0 : newValue;
			}
		} );
		_Object_defineProperty( _KeyboardEvent_prototype, "charCode", {
			"enumerable": true,
			"configurable": true,
			"get": function() {
				if( "__charCode" in this )return this["__charCode"];

				return _Event_prototype__native_keyCode_getter.call( this );
			},
			"set": function( newValue ) {
				return this["__charCode"] = isNaN( newValue ) ? 0 : newValue;
			}
		} );
	}
	else {
		_Event_prototype__native_keyCode_getter = void 0;

		/*ovewrite_keyCode_which_charCode = function(key) {
		 //["which", "keyCode", "charCode"].forEach
		 var _event = this["e"]
		 , _keyCode = this["k"]
		 ;
		 if(!_event || !_keyCode)return;

		 delete _event[key];
		 _Object_defineProperty(_event, key, {value : _keyCode});
		 }*/
	}

	if( __GCC__NEW_KEYBOARD_EVENTS_PROPOSAL__ ) {
		/**
		 * @this {Event}
		 * @param {string} originalKey
		 * */
		newKeyboadrEvent_key_property_proposal__getKey_ = function( originalKey ) {
			originalKey = originalKey || "";
			if( originalKey.length > 1 ) {//fast IS SPECIAL KEY
				return originalKey;
			}

			var eventKeyCode = this.which || this.keyCode;

			if( this.type == "keypress" ) {
				//http://www.w3.org/TR/DOM-Level-3-Events/#event-type-keypress
				//Warning! the keypress event type is defined in this specification for reference and completeness, but this specification deprecates the use of this event type. When in editing contexts, authors can subscribe to the "input" event defined in [HTML5] instead.

				eventKeyCode += _KEYPRESS_VK__CHARACTER_KEYS__DOWN_UP_DELTA;
			}

			var vkCharacterKey = VK__CHARACTER_KEYS__DOWN_UP[eventKeyCode]
				, value_is_object = vkCharacterKey && typeof vkCharacterKey == "object"
				, _key = value_is_object ? vkCharacterKey._key : vkCharacterKey
				, _keyCode
			;

			if(_key)return _key;

			_keyCode = vkCharacterKey && vkCharacterKey._keyCode
				|| (eventKeyCode > 64 && eventKeyCode < 91 && eventKeyCode)//a-z
			;

			return (_keyCode && String.fromCharCode( _keyCode ) || originalKey).toLowerCase()
		}
	}

	function _helper_isRight_keyIdentifier ( _keyIdentifier ) {
		return _keyIdentifier && !(_keyIdentifier in VK__FAILED_KEYIDENTIFIER) && _keyIdentifier.substring( 0, 2 ) !== "U+";
	}

	_Object_defineProperty( _KeyboardEvent_prototype, "key", {
		"enumerable": true,
		"configurable": true,
		"get": function() {
			var thisObj = this
				, value
			;

			if( _Event_prototype__native_key_getter ) {//IE9 & Opera
				value = _Event_prototype__native_key_getter.call( thisObj );

				if( value && value.length < 2 || _helper_isRight_keyIdentifier(value) ) {
					if( __GCC__NEW_KEYBOARD_EVENTS_PROPOSAL__ ) {
						return newKeyboadrEvent_key_property_proposal__getKey_.call( this, value );
					}
					else {
						return value;
					}
				}
			}

			if( "__key" in thisObj )return thisObj["__key"];

			if( !(thisObj.type in KEYBOARD_EVENTS) )return;

			var _keyCode = thisObj.which || thisObj.keyCode
				, notKeyPress = thisObj.type != "keypress"
				, value_is_object
			;

			if( notKeyPress ) {
				if( "keyIdentifier" in thisObj && _helper_isRight_keyIdentifier( thisObj["keyIdentifier"] ) ) {
					value = thisObj["keyIdentifier"];
				}
				else if( !__GCC__NEW_KEYBOARD_EVENTS_PROPOSAL__ || !notKeyPress || (value = VK__NON_CHARACTER_KEYS[_keyCode]) ) {
					value = value || VK__CHARACTER_KEYS__DOWN_UP[_keyCode];
					value_is_object = value && typeof value == "object";
					value =
						(value_is_object ? value._key : value) ||
							thisObj["char"]//char getter
					;
				}
				else {
					value = newKeyboadrEvent_key_property_proposal__getKey_.call( this, value );
				}
			}
			else { // For keypress
				value = thisObj["char"];//char getter
			}

			__Property_descriptor__["value"] = value;
			_Object_defineProperty(thisObj, "__key", __Property_descriptor__);
			return value;
		}
	} );
	_Object_defineProperty( _KeyboardEvent_prototype, "char", {
		"enumerable": true,
		"configurable": true,
		"get": function() {
			var thisObj = this;

			if( !(thisObj.type in KEYBOARD_EVENTS) )return;

			if( thisObj.ctrlKey
				|| thisObj.altKey
				|| thisObj.metaKey
			) {
				return "";
			}

			if( "__char" in thisObj )return thisObj["__char"];

			var value
				, notKeyPress = thisObj.type != "keypress"
				, _keyCode = !notKeyPress && thisObj["__keyCode"] || thisObj.which || thisObj.keyCode
				, value_is_object
			;

			if( notKeyPress && (value = VK__NON_CHARACTER_KEYS[_keyCode]) && !(typeof value == "object") ) {
				//Test for Special key (Esc, Shift, Insert etc) and that this Special key has no "char" value
				return "";
			}

			if( _Event_prototype__native_char_getter && (value = _Event_prototype__native_char_getter.call( thisObj )) !== null ) {//IE9 & Opera
				//unfortunately after initKeyboardEvent _Event_prototype__native_char_getter starting to return "null"
				//so save 'true' char in "__char"
			}
			else {
				value = VK__CHARACTER_KEYS__DOWN_UP[_keyCode] || VK__NON_CHARACTER_KEYS[_keyCode];
				value_is_object = value && typeof value == "object";

				if( !value_is_object || value._char === false ) {
					//For special keys event.char is empty string (or "Undeterminade" as in spec)
					value = "";
				}
				else if( value_is_object && value._char !== void 0 ) {
					value = value._char || "";
				}
				else {
					if( "keyIdentifier" in thisObj && _helper_isRight_keyIdentifier( thisObj["keyIdentifier"] ) ) {//webkit
						value = "";
					}
					else {
						/*TODO:: remove this block
						 if( notKeyPress && value_is_object && value._keyCode ) {
						 //_keyCode = value._keyCode;
						 }*/
						value = String.fromCharCode( _keyCode );
						if( notKeyPress && !thisObj.shiftKey ) {
							value = value.toLowerCase();
						}
					}
				}

			}

			__Property_descriptor__["value"] = value;
			_Object_defineProperty(thisObj, "__char", __Property_descriptor__);
			return value;
		}
	} );
	_getter_KeyboardEvent_location = function() {
		var thisObj = this;

		if( _Event_prototype__native_location_getter ) {//IE9
			return _Event_prototype__native_location_getter.call( this );
		}

		if( "__location" in thisObj )return thisObj["__location"];

		if( !(thisObj.type in KEYBOARD_EVENTS) )return;

		var _keyCode = thisObj.which || thisObj.keyCode
			, notKeyPress = thisObj.type != "keypress"
			, value
		;

		/*Not working with _KeyboardEvent function and do we realy need this anyway?
		 if(thisObj.type == "keypress") {
		 //TODO:: tests
		 value = 0;
		 }
		 else */
		if( "keyLocation" in thisObj ) {//webkit
			value = thisObj["keyLocation"];
		}
		else {
			value = notKeyPress && (VK__NON_CHARACTER_KEYS[_keyCode] || VK__CHARACTER_KEYS__DOWN_UP[_keyCode]);
			value = typeof value == "object" && value._location || _DOM_KEY_LOCATION_STANDARD;
		}

		__Property_descriptor__["value"] = value;
		_Object_defineProperty(thisObj, "__location", __Property_descriptor__);
		return value;
	};
	_Object_defineProperty( _KeyboardEvent_prototype, "location", {
		"enumerable": true,
		"configurable": true,
		"get": _getter_KeyboardEvent_location
	} );

	function _keyDownHandler ( e ) {
		var _keyCode = e.which || e.keyCode
			, thisObj = this._this
			, listener
			, _
			, vkNonCharacter
			// There is no keypress event for Ctrl + <any key> and Alt + <any key>
			//  and "char" property for for such a key combination is undefined.
			//  Not even trying to find out "char" value. It's useless
		;

		/*TODO: testing
		 if(canOverwrite_keyCode && vkCommon && vkCommon._keyCode && e.keyCode != vkCommon._keyCode) {
		 ["which", "keyCode", "charCode"].forEach(ovewrite_keyCode_which_charCode, {"e" : e, "k" : vkCommon._keyCode});
		 }*/

		if( // passed event if the is no need to transform it
			e.ctrlKey || e.altKey || e.metaKey//Special events
			|| ((vkNonCharacter = VK__NON_CHARACTER_KEYS[_keyCode]) && vkNonCharacter._key !== 0)
			|| e["__key"] || e.isTrusted === false // Synthetic event
		) {
			listener = this._listener;

			if( typeof listener === "object" ) {
				if( "handleEvent" in listener ) {
					thisObj = listener;
					listener = listener.handleEvent;
				}
			}

			if( listener && listener.apply ) {
				listener.apply( thisObj, arguments );
			}
		}
		else {
			_ = thisObj["_"] || (thisObj["_"] = {});
			_[_shim_event_keyCodeUUID] = _keyCode;

			//Fix Webkit keyLocation bug ("i", "o" and others keys "keyLocation" in 'keypress' event == 3. Why?)
			if( "keyLocation" in e ) {//TODO:: tests
				_["_keyLocation"] = e.keyLocation;
			}
		}
	}

	function _keyDown_via_keyPress_Handler ( e ) {
		var _keyCode
			, _charCode = e.which || e.keyCode
			, thisObj = this
			, _ = thisObj["_"]
			, _event
			, need__stopImmediatePropagation__and__preventDefault
			, vkCharacterKey
			, __key
		;

		if( e["__stopNow"] )return;

		if( _ && _shim_event_keyCodeUUID in _ ) {
			_keyCode = _[_shim_event_keyCodeUUID];
			delete _[_shim_event_keyCodeUUID];

			e["__keyCode"] = _keyCode;//save keyCode from 'keydown' and 'keyup' for 'keypress'

			if( vkCharacterKey = VK__CHARACTER_KEYS__DOWN_UP[_keyCode]) {
				if( IS_NEED_KEYCODE_BUGFIX && vkCharacterKey._keyCode ) {
					_keyCode = vkCharacterKey._keyCode;
				}
			}

			//Fix Webkit keyLocation bug ("i", "o" and others keys "keyLocation" in 'keypress' event == 3. Why?)
			if( "keyLocation" in e && "_keyLocation" in _ ) {//webkit//TODO:: tests
				delete e.keyLocation;
				e.keyLocation = _["_keyLocation"];
			}

			if( __GCC__NEW_KEYBOARD_EVENTS_PROPOSAL__ ) {
				if( _keyCode < 91 && _keyCode > 64 && _charCode != _keyCode && (!VK__CHARACTER_KEYS__DOWN_UP[_keyCode]) ) {
					vkCharacterKey = vkCharacterKey || (VK__CHARACTER_KEYS__DOWN_UP[_keyCode] = {});
					vkCharacterKey._keyCode = _keyCode;
				}
			}

			__key = vkCharacterKey && vkCharacterKey._key || (String.fromCharCode(_keyCode)).toLowerCase();

			e["__key"] = __key;
			e["__char"] = String.fromCharCode(_charCode);

			_event = new global["KeyboardEvent"]( "keydown", e );

			delete _event["keyLocation"];//webkit //TODO: need this???
			delete _event["__location"];

			if( canOverwrite_which ) {//Not Safari
				delete _event["which"];
				_Object_defineProperty( _event, "which", {"value": _keyCode} );
			}
			else {
				_event["__which"] = _keyCode;
			}
			if( canOverwrite_keyCode ) {//Not IE9 | Not Safari
				delete _event["keyCode"];
				_Object_defineProperty( _event, "keyCode", {"value": _keyCode} );
			}
			_event["__location"] = _getter_KeyboardEvent_location.call( _event );

			if( !_Event_prototype__native_key_getter ) {//Not IE9 & Opera 12
				vkCharacterKey = vkCharacterKey || (vkCharacterKey = VK__CHARACTER_KEYS__DOWN_UP[_charCode] = VK__CHARACTER_KEYS__DOWN_UP[_keyCode] = {});

				vkCharacterKey._char = _event["char"];

				if( !__GCC__NEW_KEYBOARD_EVENTS_PROPOSAL__ ) {
					vkCharacterKey._key = vkCharacterKey._char;
				}
			}

			need__stopImmediatePropagation__and__preventDefault = !(e.target || thisObj).dispatchEvent( _event );
			//if need__stopImmediatePropagation__and__preventDefault == true -> preventDefault and stopImmediatePropagation
		}
		else {
			//handle key what not generate character's key
			need__stopImmediatePropagation__and__preventDefault = (
				!e.ctrlKey &&
					(_ = VK__CHARACTER_KEYS__DOWN_UP[_charCode]) && (typeof _ == "object" ? _._key || "" : _).length > 1
				) ?
				2//Only stopImmediatePropagation
				:
				0//Nothing
			;
		}

		if( need__stopImmediatePropagation__and__preventDefault ) {
			if( need__stopImmediatePropagation__and__preventDefault === true ) {
				e.preventDefault();
			}

			if( _Event_has_stopImmediatePropagation ) {
				e.stopImmediatePropagation();
			}
			else {
				e["__stopNow"] = true;
				e.stopPropagation();
			}
		}
	}

	/*
	 var __TEMP_KEY
	 , __TEMP_KEYCODE
	 , __TEMP_CHAR
	 , __TEMP_KEYLOCATION
	 ;

	 document.addEventListener("mousedown", function(e) {
	 //debugger
	 var _keyCode = e.which || e.keyCode
	 , thisObj = this
	 , listener
	 , special = e.ctrlKey || e.altKey
	 , vkCommon = VK__NON_CHARACTER_KEYS[_keyCode]
	 ;

	 if(special || vkCommon && vkCommon._key !== 0 || e["__key"]) {

	 }
	 else {
	 __TEMP_KEYCODE = _keyCode;

	 //Fix Webkit keyLocation bug ("i", "o" and others keys "keyLocation" in 'keypress' event == 3. Why?)
	 if("keyLocation" in e) {//TODO:: tests
	 __TEMP_KEYLOCATION = e.keyLocation;
	 }

	 e.stopImmediatePropagation();
	 }
	 }, true);*/
	if( !_Event_prototype__native_char_getter ) {
		[
			(tmp = global["Document"]) && tmp.prototype || global["document"],
			(tmp = global["HTMLDocument"]) && tmp.prototype,
			(tmp = global["Window"]) && tmp.prototype || global,
			(tmp = global["Node"]) && tmp.prototype,
			(tmp = global["Element"]) && tmp.prototype
		].forEach( function( prototypeToFix ) {
				if(!prototypeToFix || !_hasOwnProperty(prototypeToFix, "addEventListener"))return;
				
				var old_addEventListener = prototypeToFix.addEventListener
					, old_removeEventListener = prototypeToFix.removeEventListener
				;

				if( old_addEventListener ) {					
					prototypeToFix.addEventListener = function( type, listener, useCapture ) {
						var thisObj = this
							, _
							, _eventsUUID
							, _event_UUID
							, _events_countUUID
						;

						if( (type + "").toLowerCase() === "keydown" ) {
							//debugger
							_eventsUUID = _event_eventsUUID + (useCapture ? "-" : "") + type;
							_event_UUID = _eventsUUID + (listener[_event_handleUUID] || (listener[_event_handleUUID] = ++UUID));
							_events_countUUID = _eventsUUID + "__count";

							if( !(_ = this["_"]) )_ = this["_"] = {};

							if( _event_UUID in _ )return;

							if( _[_events_countUUID] === void 0 ) {
								old_addEventListener.call( thisObj, "keypress", _keyDown_via_keyPress_Handler, true );
							}

							_[_events_countUUID] = (_[_events_countUUID] || 0) + 1;

							arguments[1] = _[_event_UUID] = _unSafeBind.call( _keyDownHandler, {_listener: listener, _this: this} );
						}

						return old_addEventListener.apply( thisObj, arguments );
					};

					if( old_removeEventListener )prototypeToFix.removeEventListener = function( type, listener, useCapture ) {
						var thisObj = this
							, _
							, _eventsUUID
							, _event_UUID
							, _events_countUUID
						;

						if( (type + "").toLowerCase() === "keydown" ) {
							_eventsUUID = _event_eventsUUID + (useCapture ? "-" : "") + type;
							_event_UUID = _eventsUUID + listener[_event_handleUUID];
							_events_countUUID = _eventsUUID + "__count";
							_ = thisObj["_"];

							if( _event_UUID && _ && _[_events_countUUID] ) {
								--_[_events_countUUID];

								if( arguments[1] = _[_event_UUID] ) {
									delete _[_event_UUID];
								}
							}
						}

						return old_removeEventListener.apply( thisObj, arguments );
					};
				}
			} );	
	}
	else {
		document.addEventListener("keydown", function(e) {
			var _char = (_Event_prototype__native_char_getter ? _Event_prototype__native_char_getter.call(e) : e["char"])
				, _charCode = _char && _char.charCodeAt(0)
				, _keyCode
				, vkCharacter
				, vkCharacter_key
			;
			if( _charCode && !(VK__CHARACTER_KEYS__DOWN_UP[_charCode += _KEYPRESS_VK__CHARACTER_KEYS__DOWN_UP_DELTA]) ) {
				vkCharacter = VK__CHARACTER_KEYS__DOWN_UP[_charCode] = {};
				_keyCode = e.keyCode;
				if( vkCharacter_key = VK__CHARACTER_KEYS__DOWN_UP[_keyCode] ) {
					_char = typeof vkCharacter_key == "object" && vkCharacter_key._key || vkCharacter_key;
				}
				else {
					_char = String.fromCharCode(_keyCode);
				}
				if(_keyCode > 64 && _keyCode < 91 && _keyCode) {//a-z
					_char = _char.toLowerCase();
				}
				vkCharacter._key = _char;
			}
		}, true);
	}


	//export
	global["KeyboardEvent"] = _KeyboardEvent;

	//cleaning
	_DOM_KEY_LOCATION_LEFT = _DOM_KEY_LOCATION_RIGHT = _DOM_KEY_LOCATION_NUMPAD = _DOM_KEY_LOCATION_MOBILE = _DOM_KEY_LOCATION_JOYSTICK =
		_Object_getOwnPropertyDescriptor = getObjectPropertyGetter = tmp = testKeyboardEvent = _KeyboardEvent = _KeyboardEvent_prototype = __i =
			_Event_prototype = _userAgent_ = _BROWSER = _IS_MAC = null;
}.call( this );
Testisimo.prototype.actions.assertElements = {
    name:'Assertion - Elements Count',
    optsTemplate:'<input type="text" class="form-control input-sm" placeholder="1" ng-model="action.opts.count">',
    optsPreview: function(opts){
        return this.name + ' "' +(opts.count||'1')+ '"';
    },
    handler: function(targets, opts, variables, done){
        if(!(opts.count||'').match(/^[0-9]*$/)) return done(new Error('Value "' +opts.count+ '" is not valid Number'));
        var count = parseInt(opts.count||'1', 10);
        if(targets.length !== count) return done(new Error('Assertion fail, expected "' +count+ '" but found "' +targets.length+ '"'));
        
        done();
    }
};Testisimo.prototype.actions.click = {
    name:'Click',
    optsTemplate:'',
    optsPreview: function(opts){
        return this.name;
    },
    handler: function(targets, opts, variables, done){
        if(targets.length === 0) return done(new Error('Target element not found'));
        if(targets.length > 1) return done(new Error('Multiple target elements found'));
        if(targets[0].offsetParent === null) return done(new Error('Target element is not visible'));
        
        targets[0].elm.focus();
        targets[0].elm.click();
        done();
    }
};
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
};Testisimo.prototype.actions.locationSetUrl = {
    name:'Location Set URL',
    optsTemplate:'<input type="text" class="form-control input-sm" placeholder="/mypath" ng-model="action.opts.location">',
    optsVariables: ['location'], // which opts properties can contain text variabes e.g. {myvar}
    optsPreview: function(opts){
        return this.name + ' "' +(opts.location||'')+ '"';
    },
    handler: function(targets, opts, variables, done){
        if(!opts.location) return done(new Error('Location not set'));
        window.location = testisimo.replaceVariables(opts.location, variables);
        done();
    }
};

Testisimo.prototype.actions.locationReload = {
    name:'Location Reload',
    optsTemplate:'',
    optsPreview: function(opts){
        return this.name;
    },
    handler: function(targets, opts, variables, done){
        window.location.reload(true);
        done();
    }
};

Testisimo.prototype.actions.locationBack = {
    name:'Location History Back (Backbutton)',
    optsTemplate:'',
    optsPreview: function(opts){
        return this.name;
    },
    handler: function(targets, opts, variables, done){
        window.history.back();
        done();
    }
};Testisimo.prototype.actions.runTest = {
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
};Testisimo.prototype.actions.wait = {
    name:'Wait (sleep)',
    optsTemplate:'<input type="number" class="form-control input-sm" ng-model="action.opts.time" placeholder="0 ms">',
    optsPreview: function(opts){
        return this.name + ' "' +(opts.time||0)+ '"';
    },
    handler: function(targets, opts, variables, done){
        setTimeout(done, opts.time||0);
    }
};