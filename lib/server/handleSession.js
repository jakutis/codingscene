var v = require('valentine');

module.exports = function(s, logger, login, board, userTracker, mailer, cfg) {
    s.on('disconnect', function() {
        s.end();
    });
    s.on('endSession', function() {
        s.end();
    });
    s.on('restoreSession', function(_, sessionId) {
        login.getSessionUser(sessionId, function(_, user) {
            s.emit('restoreSession', null, user);
            if(user !== null) {
                s.start(user);
            }
        });
    });
    s.on('patchSolution', function(_, msg) {
        login.getSessionUser(msg.sessionId, function(_, user) {
            if(user !== null) {
                board.patchSolution(user.id, msg.taskId, msg.patch, function() {
                    s.emitAll('patch-' + user.username + '-' + msg.taskId, null, {
                        username : user.username,
                        taskId : msg.taskId,
                        patch : msg.patch
                    });
                });
            }
        });
    });
    s.on('openSolution', function(_, msg) {
        login.getSessionUserId(msg.sessionId, function(_, userId) {
            if(userId !== null) {
                board.openSolution(userId, msg.taskId);
            }
        });
    });
    s.on('addTask', function(_, msg) {
        login.getSessionUserId(msg.sessionId, function(_, userId) {
            if(userId !== null) {
                board.addTask(msg.task, userId);
            }
        });
    });
    s.on('review', function(_, msg) {
        login.getSessionUserId(msg.sessionId, function(_, userId) {
            if(userId !== null) {
                board.putReview(msg.review, userId);
            }
        });
    });
    s.on('arrived', function(_, msg) {
        login.getSessionUserId(msg.sessionId, function(_, userId) {
            if(userId === cfg.client.rootUserId) {
                login.getUserId(msg.username, function(err, userId) {
                    if(err) {
                        logger.info(err);
                    } else {
                        login.setArrived(userId, msg.eventId, msg.arrived);
                    }
                });
            }
        });
    });
    s.on('mailAll', function(_, msg) {
        login.getSessionUserId(msg.sessionId, function(_, userId) {
            if(userId === cfg.client.rootUserId) {
                if(msg.mail.emails.length > 0) {
                    v.each(msg.mail.emails, function(email) {
                        mailer.sendMarkdown(email, msg.mail.subject, msg.mail.text);
                    });
                } else {
                    login.getUsers(function(_, users) {
                        v.each(users, function(user) {
                            mailer.sendMarkdown(user.name + ' <' + user.email + '>', msg.mail.subject, msg.mail.text);
                        });
                    });
                }
            }
        });
    });
    s.on('rsvp', function(_, msg) {
        login.getSessionUserId(msg.sessionId, function(_, userId) {
            if(userId !== null) {
                login.setParticipation(userId, msg.event, msg.participated);
            }
        });
    });
    s.on('getEventParticipants', function(_, msg) {
        login.isSessionValid(msg.sessionId, function(_, valid) {
            if(valid) {
                login.getEventParticipants(msg.eventId, function(_, participants) {
                    s.emit('getEventParticipants', null, participants);
                });
            } else {
                s.emit('getEventParticipants', new Error('invalid session'), null);
            }
        });
    });
    s.on('login', function(_, u) {
        login.login(u, function(_, msg) {
            s.emit('login', null, msg);
            if(msg !== null) {
                s.start(msg.user);
            }
        });
    });
    s.on('register', function(_, u) {
        login.register(u, function(_, result) {
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
                s.emitAll('userRegistered', null, {
                    username : u.username,
                    codersregistered : userTracker.registered
                });
            }
        });
    });
    s.on('changePassword', function(_, msg) {
        login.getSessionUser(msg.sessionId, function(_, user) {
            if(user !== null) {
                login.changePassword(user.username, msg.change);
            }
        });
    });
    s.on('resetPassword', function(_, msg) {
        login.resetPassword(msg.password, msg.token, function(_, msg) {
            if(msg === null) {
                s.emit('resetPassword', null, null);
            } else {
                s.start(msg.user);
                s.emit('resetPassword', null, msg);
            }
        });
    });
    s.on('confirm', function(_, key) {
        login.handleConfirmPage(key, function(_, msg) {
            if(msg === null) {
                s.emit('confirm', null, null);
            } else {
                s.start(msg.user);
                s.emit('confirm', null, msg);
            }
        });
    });
};
