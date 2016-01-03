Testisimo.prototype.actions.setLocation = {
    name:'Set Location',
    optsTemplate:'<input type="text" class="form-control input-sm" placeholder="/mypath" ng-model="action.opts.location">',
    optsVariables: ['location'], // which opts properties can contain text variabes e.g. {myvar}
    optsPreview: function(opts){
        return this.name + ' "' +(opts.text||'')+ '"';
    },
    handler: function(targets, opts, variables, done){
        if(!opts.location) return done(new Error('Location not set'));
        window.location = testisimo.replaceVariables(opts.location, variables);
        done();
    }
};