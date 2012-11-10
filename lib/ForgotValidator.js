var v = require('valentine');
var Validator = require('./Validator');
Validator = Validator.Validator;

var ForgotValidator = function() {
};
ForgotValidator.prototype = new Validator({
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
exports.ForgotValidator = ForgotValidator;
