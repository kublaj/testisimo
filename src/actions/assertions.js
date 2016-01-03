// TODO:
// assertInnerHtml, equal, contains, starts with, ends with, 
// assertAttributes 
// assertCount (innerhtml, innertext, attributes, elements count)

Testisimo.prototype.actions.assertInnerText = {
    name:'Assertion - innerText',
    optsTemplate:'<input type="text" class="form-control input-sm" placeholder="inner Text" ng-model="action.opts.text">',
    optsPreview: function(opts){
        return this.name + ' "' +(opts.value||0)+ '"';
    },
    handler: function(targets, opts, variables, done){
        if(targets.length === 0) return done(new Error('Target element not found'));
    }
};