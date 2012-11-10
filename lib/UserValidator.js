var v = require('valentine');
var Validator = require('./Validator');
Validator = Validator.Validator;

var UserValidator = function() {
};
UserValidator.prototype = new Validator({
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
    },
    email : function(user, cb) {
        if(typeof user.email !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.email.length === 0) {
            cb(null, [new Error('Empty')]);
        } else if(user.email.length > 255) {
            cb(null, [new Error('Longer than 255 characters')]);
        } else if(!/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/.test(user.email)) {
            cb(null, [new Error('Not an email')]);
        } else {
            cb(null, []);
        }
    },
    name : function(user, cb) {
        if(typeof user.name !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.name.length === 0) {
            cb(null, [new Error('Empty')]);
        } else if(user.name.length > 255) {
            cb(null, [new Error('Exceeds 255 characters')]);
        } else {
            cb(null, []);
        }
    },
    twitter : function(user, cb) {
        if(typeof user.twitter !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.twitter.length > 255) {
            cb(null, [new Error('Exceeds 255 characters')]);
        } else {
            cb(null, []);
        }
    },
    about : function(user, cb) {
        if(typeof user.about !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.about.length > 65536) {
            cb(null, [new Error('Exceeds 65536 characters')]);
        } else {
            cb(null, []);
        }
    },
    username : function(user, cb) {
        if(typeof user.username !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.username.length === 0) {
            cb(null, [new Error('Empty')]);
        } else if(user.username.length > 50) {
            cb(null, [new Error('Longer than 50 characters')]);
        } else if(!/^[a-zA-Z0-9\.]*$/.test(user.username)) {
            cb(null, [new Error('Can contain only letters, numbers and periods')]);
        } else {
            this._usernameUniqueChecker(user.username, function(_, unique) {
                if(unique) {
                    cb(null, []);
                } else {
                    cb(null, [new Error('Taken')]);
                }
            });
        }
    },
    requests : function(user, cb) {
        if(typeof user.requests !== 'string') {
            cb(null, [new Error('Not a string')]);
        } else if(user.requests.length > 65536) {
            cb(null, [new Error('Exceeds 65536 characters')]);
        } else {
            cb(null, []);
        }
    }
});
UserValidator.prototype._usernameUniqueChecker = function(user, cb) {
    cb(null, false);
};
UserValidator.prototype.setUsernameUniqueChecker = function(f) {
    this._usernameUniqueChecker = f;
};
exports.UserValidator = UserValidator;
