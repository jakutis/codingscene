var v = require('valentine');
var a = require('async');

var Validator = function(validators) {
    this._validators = validators;
};
Validator.prototype = {
    _validators : null,
    validate : function(user, cb) {
        var self = this;
        var validators = Object.keys(self._validators);
        a.map(validators, function(validator, cb) {
            self._validators[validator].call(self, user, cb);
        }, function(err, results) {
            if(err) {
                cb(err);
                return;
            }
            var errors = {}, has = false;
            v.each(validators, function(key, i) {
                errors[key] = results[i];
                if(results[i].length > 0) {
                    has = true;
                }
            });
            cb(null, has ? errors : null);
        });
    },
    getProperties : function() {
        return v.keys(this._validators);
    },
    validateProperty : function(user, property, cb) {
        this._validators[property].call(this, user, cb);
    }
};
exports.Validator = Validator;
