var store = require('store');

module.exports = {
    set : function(key, value, cb) {
        store.set(key, value);
        setTimeout(function() {
            cb(null);
        }, 0);
    },
    get : function(key, cb) {
        setTimeout(function() {
            cb(null, store.get(key));
        }, 0);
    },
    remove : function(key, cb) {
        store.remove(key);
        setTimeout(function() {
            cb(null);
        }, 0);
    },
    clear : function(cb) {
        store.clear();
        setTimeout(function() {
            cb(null);
        }, 0);
    }
};
