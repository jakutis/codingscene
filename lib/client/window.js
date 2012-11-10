var cookie = require('cookie');
var bonzo = require('bonzo');
var w = window;

exports.el = function(id) {
    return bonzo(w.document.getElementById(id));
};
exports.window = w;
w.global = w;
exports.textareaToEditor = function(textarea) {
    return w.ace.edit(textarea);
};
exports.getPath = function() {
    return w.location.pathname;
};
exports.setHref = function(href) {
    w.location.href = href;
};
exports.setCookie = function(name, value, remember) {
    if(value === null) {
        var exp = new Date();
        exp.setDate(exp.getDate() - 1);
        w.document.cookie = cookie.serialize(name, '', {
            path : '/',
            expires : exp
        });
    } else {
        var age = 60 * 60 * 24 * 365 * 100;
        w.document.cookie = cookie.serialize(name, value, {
            path : '/',
            expires : remember ? new Date(new Date().getTime() + 1000 * age) : null,
            secure : false,
            httpOnly : false,
            maxAge : remember ? age : null
        });
    }
};
exports.getCookie = function(name) {
    var cookies = cookie.parse(w.document.cookie);
    if(typeof cookies[name] === 'string') {
        return cookies[name];
    } else {
        return null;
    }
};
