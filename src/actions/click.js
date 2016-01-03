Testisimo.prototype.actions.click = {
    name:'Click',
    optsTemplate:'',
    optsPreview: function(opts){
        return this.name;
    },
    handler: function(targets, opts, variables, done){
        if(targets.length === 0) return done(new Error('Target element not found'));
        for(var i=0;i<targets.length;i++) {
            targets[i].elm.focus();
            targets[i].elm.click();
        }
        done();
    }
};