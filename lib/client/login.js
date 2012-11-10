var bv = require('./validator-bootstrap');
var LoginValidator = require('../LoginValidator');
var loginValidator = new LoginValidator.LoginValidator();
var ForgotValidator = require('../ForgotValidator');
var forgotValidator = new ForgotValidator.ForgotValidator();
var bean = require('bean');
var bonzo = require('bonzo');
var v = require('valentine');
var qwery = require('qwery');
var window = require('./window');
var loginResult;
bean.add(loginValidator, 'validation', function(property, errors) {
    loginResult.addClass('hidden');
});

exports.init = function(page, t, cb) {
    page.handle(/^\/login$/, function(from, to) {
        page.body.append(t.login());
        page.beforego(function(from, to) {
            page.body.empty();
        });
        loginResult = bonzo(qwery('#loginResult')[0]);
        var forgotModel = {
            username : bv.makeProperty('username')
        };
        var model = {
            username : bv.makeProperty('username'),
            password : bv.makeProperty('password')
        };
        bv.listen(model, loginValidator);
        model.username._input.focus();
        bean.add(qwery('#loginForm')[0], 'submit', function(e) {
            e.preventDefault();

            var login = bv.extract(model);
            v.each(model, function(key, property) {
                model[key].touched = true;
                bv.validateProperty(loginValidator, false, model, login, key, property);
            });
            loginValidator.validate(login, function(_, errors) {
                if(!errors) {
                    page.once('login', function(_, msg) {
                        if(msg === null) {
                            model.username.error([]);
                            model.password.error([]);
                            model.username._input.focus();
                            loginResult.removeClass('hidden');
                            loginResult.html('<p>Incorrect username/email or password.</p>');
                        } else {
                            page.setId(msg.sessionId, bonzo(qwery('#rememberme')).attr('checked'));
                            page.setUser(msg.user);
                            page.go('/');
                        }
                    });
                    page.emit('login', null, login);
                }
            });
        });
        bean.add(qwery('#forgot')[0], 'click', function(e) {
            e.preventDefault();

            var forgot = bv.extract(forgotModel);
            v.each(forgotModel, function(key, property) {
                forgotModel[key].touched = true;
                bv.validateProperty(forgotValidator, false, forgotModel, forgot, key, property);
            });
            forgotValidator.validate(forgot, function(_, errors) {
                if(!errors) {
                    page.req('/sendReminder', forgot, function(_, reminderSent) {
                        if(reminderSent) {
                            page.body.empty();
                            page.body.append(t.reminderSent());
                        } else {
                            model.username.error([]);
                            model.password.ok();
                            loginResult.removeClass('hidden');
                            loginResult.html('<p>Incorrect username or email.</p>');
                        }
                    });
                } else {
                    forgotModel.username._input.focus();
                }
            });
        });
    });
    cb(null);
};

