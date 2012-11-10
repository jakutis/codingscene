var v = require('valentine');
var Validator = require('./Validator');
Validator = Validator.Validator;

var PasswordChangeValidator = function() {
};
PasswordChangeValidator.prototype = new Validator({
    password0 : function(user, cb) {
        if(typeof user.password0 !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.password0.length === 0) {
            cb(null, [new Error('Empty')]);
        } else {
            cb(null, []);
        }
    },
    password1 : function(user, cb) {
        if(typeof user.password1 !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.password1 !== user.password0) {
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
            this._passwordCorrectChecker(user.password, function(_, correct) {
                if(correct) {
                    cb(null, []);
                } else {
                    cb(null, [new Error('Incorrect')]);
                }
            });
        }
    }
});
PasswordChangeValidator.prototype._passwordCorrectChecker = function(password, cb) {
    cb(null, false);
};
PasswordChangeValidator.prototype.setPasswordCorrectChecker = function(f) {
    this._passwordCorrectChecker = f;
};
exports.PasswordChangeValidator = PasswordChangeValidator;
