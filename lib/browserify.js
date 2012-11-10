var w = require('./client/window');
if(typeof window.console === 'undefined' || typeof window.console.log === 'undefined' || w.getCookie('debug') !== 'yes') {
    window.console = {
        log : function() {
        }
    };
}
var client = require('./client/index');
