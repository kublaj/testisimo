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
};