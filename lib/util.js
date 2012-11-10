var v = require('valentine');
var hogan = require('hogan.js');

exports.noop = function() {
};
exports.now = function() {
    return Math.floor((new Date()).getTime()/1000);
};
exports.values = function(o) {
    var vals = [];
    v.each(o, function(_, val) {
        vals.push(val);
    });
    return vals;
};
exports.compileTemplates = function(templates, target) {
    var id = 0;
    var targetTemplates = {};
    v.each(templates, function(key, value) {
        var template = hogan.compile(value);
        targetTemplates[key] = template;
        target[key] = function(data) {
            return template.render(data, targetTemplates);
        };
    });
    target._ = function() {
        id += 1;
        return 'app-' + id;
    };
};
exports.startsWith = function(s, start) {
    return s.substr(0, start.length) === start;
};
exports.apply = function(fns) {
    v.each(fns, function(fn) {
        fn();
    });
};
