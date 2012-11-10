var bean = require('bean');
var bonzo = require('bonzo');
var qwery = require('qwery');
var w = require('./window');
var cfg = require('./cfg');
var v = require('valentine');
var validator = require('../UserValidator');
var userValidator = new validator.UserValidator();
var bv = require('./validator-bootstrap');
var model = null;

bean.add(userValidator, 'validation', function(property, errors) {
    if(model.username._container.hasClass('success') && model.password._container.hasClass('success') && model.passwordc._container.hasClass('success') && model.email._container.hasClass('success')) {
        v.each(qwery('.hidden'), function(el) {
            bonzo(el).removeClass('hidden');
        });
    }
});

exports.init = function(page, t, cb) {
    userValidator.setUsernameUniqueChecker(function(username, cb) {
        page.req('/getUserExistence', username, function(_, exists) {
            cb(null, !exists);
        });
    });
    page.handle(/^\/account\/confirm\/(.+)$/, function(from, to, token) {
        page.once('confirm', function(err, msg) {
            if(err) {
                page.body.append(t.notFound());
            } else {
                page.body.append(t.confirmed({
                    baseurl : cfg.baseurl
                }));
                page.setId(msg.sessionId);
                page.setUser(msg.user);
            }
            page.beforego(function(from, to) {
                page.body.empty();
            });
        });
        page.emit('confirm', null, token);
    });
    cb(null);
};

exports.handle = function(page, t, from) {
    var d = {
        usernameok : true,
        passwordok : true,
        passwordcok : true,
        nameok : true,
        twitterok : true,
        aboutok : true,
        requestsok : true,
        emailok : true
    };
    d['class'] = 'hidden';
    d.registrationExtension = t.registrationExtension(d);
    page.body.append(t.registration(d));
    var register = w.el('register');
    if(register.length > 0) {
        model = {
            username : bv.makeProperty('username'),
            name : bv.makeProperty('name'),
            twitter : bv.makeProperty('twitter'),
            password : bv.makeProperty('password', ['passwordc']),
            passwordc : bv.makeProperty('passwordConfirmation', function(user) {
                user.passwordc.password = function(cb) {
                    cb(user.passwordc === user.password);
                };
            }),
            email : bv.makeProperty('email'),
            about : bv.makeProperty('about'),
            requests : bv.makeProperty('requests')
        };
        bv.listen(model, userValidator);
        model.username._input.focus();
        bean.add(register[0].form, 'submit', function(e) {
            e.preventDefault();

            var user = bv.extract(model);

            v.each(model, function(key, property) {
                model[key].touched = true;
                bv.validateProperty(userValidator, false, model, user, key, property);
            });

            userValidator.validate(user, function(_, errors) {
                if(!errors) {
                    var unlisten = page.on('userRegistered', function(_, msg) {
                        if(msg.username === user.username) {
                            page.body.html(t.registered());
                            unlisten();
                        }
                    });
                    page.emit('register', null, user);
                } else {
                    if(model.username.hasError()) {
                        model.username._input.focus();
                    } else if(model.password.hasError()) {
                        model.password._input.focus();
                    } else if(model.passwordc.hasError()) {
                        model.passwordc._input.focus();
                    } else if(model.email.hasError()) {
                        model.email._input.focus();
                    } else if(model.name.hasError()) {
                        model.name._input.focus();
                    } else if(model.twitter.hasError()) {
                        model.twitter._input.focus();
                    } else if(model.about.hasError()) {
                        model.about._input.focus();
                    } else if(model.requests.hasError()) {
                        model.requests._input.focus();
                    }
                }
            });
        });
    }
    page.beforego(function(from, to) {
        page.body.empty();
    });
};
