Testisimo.prototype.actions.wait = {
    name:'Wait (sleep)',
    optsTemplate:'<input type="number" class="form-control input-sm" ng-model="action.opts.time" placeholder="0 ms">',
    optsPreview: function(opts){
        return this.name + ' "' +(opts.time||0)+ '"';
    },
    handler: function(targets, opts, variables, done){
        setTimeout(done, opts.time||0);
    }
};