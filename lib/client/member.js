var a = require('async');
var cfg = require('./cfg');
var bv = require('./validator-bootstrap');
var w = require('./window');
var bean = require('bean');
var humane = require('humane-js');
var v = require('valentine');
var PasswordChangeValidator = require('../PasswordChangeValidator');

humane.baseCls = 'humane-libnotify';
var changeValidator = new PasswordChangeValidator.PasswordChangeValidator();

exports.init = function(page, t, cb) {
    changeValidator.setPasswordCorrectChecker(function(password, cb) {
        page.req('/isPasswordCorrect', {
            username : page.getUser().username,
            password : password
        }, cb);
    });
    page.handle(/^\/member\/(.+)$/, function(from, to, username) {
        page.req('/getUser', {
            sessionId : page.getId(),
            username : username
        }, function(err, user) {
            if(err) {
                throw err;
            }
            var current = user.username === page.getUser().username;
            user.hasTwitter = user.twitter.length > 0;
            page.body.append(t.member({
                baseurl : cfg.baseurl,
                current : current,
                user : user
            }));
            page.beforego(function(from, to) {
                page.body.empty();
            });
            if(current) {
                var model = {
                    password : bv.makeProperty('password'),
                    password0 : bv.makeProperty('password0', ['password1']),
                    password1 : bv.makeProperty('password1')
                };
                var listen = bv.listen(model, changeValidator);
                bean.add(w.el('changePasswordForm')[0], 'submit', function(e) {
                    e.preventDefault();
                    var change = bv.extract(model);
                    v.each(model, function(key, property) {
                        model[key].touched = true;
                        bv.validateProperty(changeValidator, false, model, change, key, property);
                    });
                    changeValidator.validate(change, function(_, errors) {
                        if(!errors) {
                            listen.stop();
                            v.each(model, function(key, property) {
                                model[key].touched = false;
                            });
                            page.emit('changePassword', null, {
                                change : change,
                                sessionId : page.getId()
                            });
                            model.password._input.blur();
                            model.password0._input.blur();
                            model.password1._input.blur();
                            model.password._input.val('');
                            model.password0._input.val('');
                            model.password1._input.val('');
                            model.password.normal();
                            model.password0.normal();
                            model.password1.normal();
                            humane.log('Password changed!');
                        }
                    });


                });
            }
        });
    });
    cb(null);
};
