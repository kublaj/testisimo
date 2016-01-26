Testisimo.prototype.actions.click = {
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