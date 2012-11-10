var v = require('valentine');
var Validator = require('./Validator');
Validator = Validator.Validator;

var PasswordResetValidator = function() {
};
PasswordResetValidator.prototype = new Validator({
    passwordc : function(user, cb) {
        if(typeof user.passwordc !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.passwordc !== user.password) {
            cb(null, [new Error('Passwords do not match')]);
        } else {
            cb(null, []);
        }
    },
    password : function(user, cb) {
        if(typeof user.password !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.password.length === 0) {
            cb(null, [new Error('Empty')]);
        } else {
            cb(null, []);
        }
    }
});
exports.PasswordResetValidator = PasswordResetValidator;
