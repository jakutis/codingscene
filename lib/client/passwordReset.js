var humane = require('humane-js');
var window = require('./window');
var bv = require('./validator-bootstrap');
var PasswordResetValidator = require('../PasswordResetValidator');
var resetValidator = new PasswordResetValidator.PasswordResetValidator();
var bean = require('bean');
var bonzo = require('bonzo');
var v = require('valentine');
var qwery = require('qwery');

exports.init = function(page, t, cb) {
    page.handle(/^\/account\/passwordReset\/(.+)$/, function(from, to, token) {
        page.body.append(t.passwordReset());
        page.beforego(function(from, to) {
            page.body.empty();
        });
        var model = {
            passwordc : bv.makeProperty('passwordc'),
            password : bv.makeProperty('password')
        };
        bv.listen(model, resetValidator);
        model.password._input.focus();
        bean.add(qwery('#resetForm')[0], 'submit', function(e) {
            e.preventDefault();
            var reset = bv.extract(model);
            v.each(model, function(key, property) {
                model[key].touched = true;
                bv.validateProperty(resetValidator, false, model, reset, key, property);
            });
            resetValidator.validate(reset, function(_, errors) {
                if(!errors) {
                    page.once('resetPassword', function(_, msg) {
                        if(msg !== null) {
                            humane.log('Password changed!');
                            page.setId(msg.sessionId);
                            page.setUser(msg.user);
                            page.go('/');
                        }
                    });
                    page.emit('resetPassword', null, {
                        token : token,
                        password : reset.password
                    });
                }
            });
        });
    });
    cb(null);
};

