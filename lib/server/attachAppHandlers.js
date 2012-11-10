var v = require('valentine');
var util = require('../util');
var sutil = require('./util');

module.exports = function(app, logger, login, userTracker, render, board, cfg, t) {
    var handle = function(resource, cb) {
        app.post('/api/0' + resource, function(req, res) {
            logger.info('respond API', resource, req.body);
            cb(req.body, function(err, msg) {
                if(err) {
                    msg = {
                        err : err,
                        msg : null
                    };
                } else {
                    msg = {
                        err : null,
                        msg : msg
                    };
                }
                res.send(JSON.stringify(msg));
            });
        });
    };

    app.post('/', function(req, res) {
        logger.info('respond post /');
        var u = req.body;
        login.register(u, function(err, result) {
            logger.info('post /', 'userRegistered', err, result);
            if(result === 'new') {
                userTracker.users[u.username] = {
                    username : u.username,
                    twitter : u.twitter,
                    name : u.name,
                    email : u.email,
                    about : u.about,
                    requests : u.requests,
                    online : false
                };
                userTracker.registered += 1;
            }
            if(err) {
                u.errors = {};
                v.each(err, function(property, errs){
                    u[property + 'ok'] = errs.length === 0;
                    u.errors[property] = errs;
                });
                u.registrationExtension = t.registrationExtension(u);
                render(req, res, null, t.registration(u));
            } else {
                render(req, res, null, t.registered({}));
            }
        });
    });

    app.get('/', function(req, res) {
        logger.info('respond get /');
        if(req.cookies.script === '1') {
            render(req, res, null);
            return;
        }
        login.getSessionUser(req.sessionId, function(_, user) {
            if(user === null) {
                var u = {
                    usernameok : true,
                    passwordok : true,
                    passwordcok : true,
                    nameok : true,
                    twitterok : true,
                    aboutok : true,
                    requestsok : true,
                    emailok : true
                };
                u.registrationExtension = t.registrationExtension(u);
                render(req, res, null, t.registration(u));
            } else {
                sutil.notFound(null, res, cfg.client, t);
            }
        });
    });
    app.get('/logout', function(req, res){
        logger.info('respond get /logout');
        sutil.sendSessionId(res, null);
        res.redirect('/');
    });

    app.get('/login', function(req, res){
        logger.info('respond get /login');
        login.getSessionUser(req.sessionId, function(_, user) {
            if(user === null) {
                if(req.cookies.script === '1') {
                    render(req, res, null);
                } else {
                    render(req, res, null, t.login());
                }
            } else {
                res.redirect('/');
            }
        });
    });

    app.get(/^\/account\/confirm\/(.+)$/, function(req, res) {
        logger.info('respond get /account/confirm');
        if(req.cookies.script === '1') {
            render(req, res, null);
            return;
        }
        login.handleConfirmPage(req.params[0], function(_, msg) {
            if(msg === null) {
                sutil.notFound(null, res, cfg.client, t);
            } else {
                sutil.sendSessionId(res, msg.sessionId);
                render(req, res, msg.user, t.confirmed({
                    baseurl : cfg.client.baseurl
                }));
            }
        });
    });

    handle('/submitSolution', function(msg, cb) {
        login.getSessionUserId(msg.sessionId, function(_, userId) {
            if(userId === null) {
                cb(null, null);
            } else {
                msg.submission.userId = userId;
                board.submitSolution(msg.submission, cb);
            }
        });
    });
    handle('/sendReminder', function(msg, cb) {
        login.sendResetLink(msg.username, cb);
    });
    handle('/getUsers', function(sessionId, cb) {
        login.isSessionValid(sessionId, function(err, valid) {
            if(err) {
                cb(err, null);
            } else if(valid) {
                cb(null, userTracker.users);
            } else {
                cb('invalid session', null);
            }
        });
    });
    handle('/getUserEvents', function(sessionId, cb) {
        login.getSessionUserId(sessionId, function(err, userId) {
            if(err) {
                cb(err, null);
            } else if(userId === null) {
                cb('invalid session', null);
            } else {
                login.getUserEvents(userId, cb);
            }
        });
    });
    handle('/getSubmissions', function(msg, cb) {
        board.getSubmissions(msg.taskId, msg.username, cb);
    });
    handle('/getSolution', function(msg, cb) {
        board.getSolution(msg.taskId, msg.username, cb);
    });
    handle('/getUserExistence', v.bind(login, login.usernameExists));
    handle('/isPasswordCorrect', function(msg, cb) {
        login.isPasswordCorrect(msg.username, msg.password, cb);
    });
    handle('/getUser', function(msg, cb) {
        login.isSessionValid(msg.sessionId, function(err, valid) {
            if(err) {
                cb(err, null);
            } else if(valid) {
                cb(null, userTracker.users[msg.username]);
            } else {
                cb('invalid session', null);
            }
        });
    });
    handle('/getEventTasks', v.bind(board, board.getEventTasks));

    app.get('*', function(req, res) {
        logger.info('respond get CATCHALL', req.path);
        if(req.cookies.script === '1') {
            render(req, res, null);
            return;
        }
        login.getSessionUser(req.sessionId, function(_, user) {
            sutil.notFound(user, res, cfg.client, t);
        });
    });
    app.post('*', function(req, res) {
        logger.info('respond post CATCHALL', req.path);
        login.getSessionUser(req.sessionId, function(_, user) {
            sutil.notFound(user, res, cfg.client, t);
        });
    });
};
