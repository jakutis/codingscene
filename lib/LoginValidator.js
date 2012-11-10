var v = require('valentine');
var Validator = require('./Validator');
Validator = Validator.Validator;

var LoginValidator = function() {
};
LoginValidator.prototype = new Validator({
    password : function(user, cb) {
        if(typeof user.password !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.password.length === 0) {
            cb(null, [new Error('Empty')]);
        } else {
            cb(null, []);
        }
    },
    username : function(user, cb) {
        if(typeof user.username !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.username.length === 0) {
            cb(null, [new Error('Empty')]);
        } else {
            cb(null, []);
        }
    }
});
exports.LoginValidator = LoginValidator;
