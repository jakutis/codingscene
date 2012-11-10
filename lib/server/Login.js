var a = require('async');
var util = require('./util');
var cutil = require('../util');
var v = require('valentine');
var UserValidator = require('../UserValidator');
UserValidator = UserValidator.UserValidator;
var PasswordChangeValidator = require('../PasswordChangeValidator');

var Login = function() {
};

Login.prototype = {
    _db : null,
    _userTracker : null,
    _salt : null,
    init : function(logger, db, mailer, userTracker, salt) {
        var self = this;
        self._salt = salt;
        self._userTracker = userTracker;
        self._logger = logger;
        self._db = db;
        self._mailer = mailer;
        self._userValidator = new UserValidator();
        self._userValidator.setUsernameUniqueChecker(function(username, cb) {
            self.usernameExists(username, function(_, exists) {
                cb(null, !exists);
            });
        });
        return self;
    },
    usernameExists : function(username, cb) {
        var self = this;
        self._db.query('SELECT COUNT(`id`) as `count` FROM `users` WHERE LOWER(`username`) = ?', [ username.toLowerCase() ], function(err, results) {
            if(err) {
                throw err;
            }
            cb(null, results[0].count > 0);
        });
    },
    emailExists : function(email, cb) {
        var self = this;
        self._db.query('SELECT COUNT(`id`) as `count` FROM `users` WHERE LOWER(`email`) = ?', [ email.toLowerCase() ], function(err, results) {
            if(err) {
                throw err;
            }
            cb(null, results[0].count > 0);
        });
    },
    handleConfirmPage : function(hash, cb) {
        var self = this;
        self._db.query('SELECT `id`, `username` FROM `users` WHERE `email_confirmed` = ?', [ hash ], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                var userId = results[0].id;
                var username = String(results[0].username);
                self._db.query('UPDATE `users` SET `email_confirmed` = NULL WHERE `id` = ?', [ userId ], function(err, results) {
                    if(err) {
                        throw err;
                    }
                    self.startSession(userId, function(_, sessionId) {
                        cb(null, {
                            sessionId : sessionId,
                            user : {
                                username : username
                            }
                        });
                    });
                });
            } else {
                cb(null, null);
            }
        });
    },
    isPasswordCorrect : function(username, password, cb) {
        var self = this;
        cb = cb || cutil.noop;
        self._db.query('SELECT `id` FROM `users` WHERE `username` = ? AND `password` = ?', [ username, util.hash(new Buffer(password), self._salt) ], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                cb(null, true);
            } else {
                cb(null, false);
            }
        });
    },
    changePassword : function(username, change, cb) {
        var self = this;
        cb = cb || cutil.noop;
        var changeValidator = new PasswordChangeValidator.PasswordChangeValidator();
        changeValidator.setPasswordCorrectChecker(function(password, cb) {
            self.isPasswordCorrect(username, password, cb);
        });
        changeValidator.validate(change, function(_, errors) {
            if(!errors) {
                self._db.query('UPDATE `users` SET `password` = ? WHERE `username` = ?', [ util.hash(new Buffer(change.password0), self._salt), username ]);
                cb(null);
            } else {
                cb(errors);
            }
        });
    },
    resetPassword : function(password, hash, cb) {
        var self = this;
        self._db.query('SELECT `id`, `username` FROM `users` WHERE `password_reset` = ?', [ hash ], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                var userId = results[0].id;
                var username = results[0].username;
                self._db.query('UPDATE `users` SET `password_reset` = NULL, `password` = ? WHERE `id` = ?', [ util.hash(new Buffer(password), self._salt), userId ], function(err) {
                    if(err) {
                        throw err;
                    }
                    self.startSession(userId, function(_, sessionId) {
                        cb(null, {
                            sessionId : sessionId,
                            user : {
                                username : username
                            }
                        });
                    });
                });
            } else {
                cb(null, null);
            }
        });
    },
    register : function(user, cb) {
        var self = this;
        self._userValidator.validate(user, function(_, errors) {
            if(!errors) {
                util.generateHash(self._db, 'SELECT COUNT(`id`) as `count` FROM `users` WHERE `email_confirmed` = ?', self._salt, function(_, emailConfirmed) {
                    self.emailExists(user.email, function(_, exists) {
                        if(exists) {
                            self._db.query('UPDATE `users` SET `email_confirmed` = ? WHERE `email` = ?', [ emailConfirmed, user.email ], function(err, results) {
                                if(err) {
                                    throw err;
                                }
                                self._mailer.sendConfirmation(user, emailConfirmed);
                                cb(null, 'existing');
                            });
                        } else {
                            self._db.query('INSERT INTO `users` VALUES(NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL)', [ user.username, util.hash(new Buffer(user.password), self._salt), user.email, user.about, user.requests, emailConfirmed, user.twitter, user.name ], function(err, results) {
                                if(err) {
                                    throw err;
                                }
                                self._mailer.sendConfirmation(user, emailConfirmed);
                                self._mailer.sendNotification(user, emailConfirmed);
                                cb(null, 'new');
                            });
                        }
                    });
                });
            } else {
                cb(errors, 'invalid');
            }
        });
    },
    sendResetLink : function(username, cb) {
        var self = this;
        username = username.toLowerCase();
        self._db.query('SELECT `id`, `username`, `email` FROM `users` WHERE LOWER(`email`) = ? OR LOWER(`username`) = ?', [ username, username ], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                var user = results[0];
                user.username = String(user.username);
                user.email = String(user.email);
                util.generateHash(self._db, 'SELECT COUNT(`id`) as `count` FROM `users` WHERE `password_reset` = ?', self._salt, function(_, hash) {
                    self._db.query('UPDATE `users` SET `password_reset` = ? WHERE `id` = ?', [ hash, user.id ], function(err, _) {
                        if(err) {
                            throw err;
                        }
                        self._mailer.sendReminder(user.username, user.email, hash);
                    });
                });
                cb(null, true);
            } else {
                cb(null, false);
            }
        });
    },
    login : function(user, cb) {
        var self = this;
        self._db.query('SELECT `id`, `username` FROM `users` WHERE (LOWER(`username`) = ? OR LOWER(`email`) = ?) AND `password` = ?', [ user.username.toLowerCase(), user.username.toLowerCase(), util.hash(new Buffer(user.password), self._salt) ], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                self.startSession(results[0].id, function(_, sessionId) {
                    cb(null, {
                        sessionId : sessionId,
                        user : {
                            username : results[0].username,
                            id : results[0].id
                        }
                    });
                });
            } else {
                cb(null, null);
            }
        });
    },
    startSession : function(userId, cb) {
        var self = this;
        util.generateHash(self._db, 'SELECT COUNT(`id`) as `count` FROM `sessions` WHERE `id` = ?', self._salt, function(_, sessionId) {
            self._db.query('INSERT INTO `sessions` VALUES(NULL, ?, ?)', [ sessionId, userId], function(err, results) {
                if(err) {
                    throw err;
                }
                cb(null, sessionId);
            });
        });
    },
    getEvent : function(eventId, cb) {
        var self =  this;
        self._db.query('SELECT `id`, `title`, `doodle` FROM `events` WHERE `id` = ?', [eventId], function(err, event) {
            if(err) {
                throw err;
            }
            if(event.length > 0) {
                cb(null, event[0]);
            } else {
                cb(new Error('event with id = ' + eventId + ' does not exist'), null);
            }
        });

    },
    getEventTaskIds : function(eventId, cb) {
        var self =  this;
        self._db.query('SELECT `id` FROM `tasks` WHERE `event` = ?', [eventId], function(err, tasks) {
            if(err) {
                throw err;
            }
            cb(null, v.map(tasks, function(task) {
                return task.id;
            }));
        });
    },
    getEventActivities : function(eventId, cb) {
        var self =  this;
        self._db.query('SELECT `id`, `from`, `to`, `title` FROM `activities` WHERE `event` = ?', [eventId], function(err, activities) {
            if(err) {
                throw err;
            }
            cb(null, activities);
        });
    },
    getEventParticipants : function(eventId, cb) {
        var self =  this;
        self._db.query('SELECT `participations`.`arrived`, `users`.`username` FROM `participations`, `users` WHERE `participations`.`event` = ? AND `participations`.`user` = `users`.`id` AND `participations`.`rsvp` = 1', [eventId], function(err, participants) {
            if(err) {
                throw err;
            }
            var p = {};
            v.each(participants, function(participant) {
                participant.online = self._userTracker.users[participant.username].online;
                participant.arrived = participant.arrived === 1;
                p[participant.username] = participant;
            });
            cb(null, p);
        });
    },
    getEventParticipation : function(eventId, userId, cb) {
        var self =  this;
        self._db.query('SELECT `rsvp`, `arrived` FROM `participations` WHERE `user` = ? AND `event` = ?', [userId, eventId], function(err, participation) {
            if(err) {
                throw err;
            }
            if(participation.length > 0) {
                cb(null, {
                    rsvp : participation[0].rsvp === 1,
                    arrived : participation[0].arrived === 1
                });
            } else {
                cb(null, {
                    rsvp : 0,
                    arrived : 0
                });
            }
        });
    },
    getUserEvents : function(userId, cb) {
        var self =  this;
        self._db.query('SELECT `id`, `title`, `doodle` FROM `events`', [], function(err, events) {
            if(err) {
                cb(err);
                return;
            }
            a.map(events, function(event, cb) {
                a.series([function(cb) {
                    self.getEventActivities(event.id, cb);
                }, function(cb) {
                    self.getEventParticipation(event.id, userId, cb);
                }, function(cb) {
                    self.getEventTaskIds(event.id, cb);
                }, function(cb) {
                    self.getEventParticipants(event.id, cb);
                }], function(err, results) {
                    if(err) {
                        cb(err);
                        return;
                    }
                    event.activities = results[0];
                    event.participation = results[1];
                    event.taskIds = results[2];
                    event.participants = results[3];
                    cb(null, event);
                });
            }, cb);
        });
    },
    getUserId : function(username, cb) {
        var self = this;
        self._db.query('SELECT `id` FROM `users` WHERE `username` = ?', [username], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                cb(null, results[0].id);
            } else {
                cb('Login.getUserId: no such user ' + username, null);
            }
        });
    },
    getUsers : function(cb) {
        var self = this;
        self._db.query('SELECT `username`,`name`,`email`,`twitter`,`about`,`requests` FROM `users`', [], cb);
    },
    setArrived : function(userId, eventId, arrived) {
        var self = this;
        arrived = arrived ? 1 : 0;
        self._db.query('UPDATE `participations` SET `arrived` = ? WHERE `user` = ? AND `event` = ?', [arrived, userId, eventId], function(err, results) {
            if(results.affectedRows === 0) {
                self._db.query('INSERT INTO `participations` VALUES(NULL, ?, ?, ?, ?)', [userId, eventId, arrived, 1]);
            }
        });
    },
    setParticipation : function(userId, eventId, participated) {
        var self = this;
        participated = participated ? 1 : 0;
        self.getEventActivities(eventId, function(_, activities) {
            if(activities.length > 0 && activities[0].from > cutil.now()) {
                self._db.query('UPDATE `participations` SET `rsvp` = ? WHERE `user` = ? AND `event` = ?', [participated, userId, eventId], function(err, results) {
                    if(results.affectedRows === 0) {
                        self._db.query('INSERT INTO `participations` VALUES(NULL, ?, ?, ?, ?)', [userId, eventId, 0, participated]);
                    }
                });
            }
        });
    },
    isSessionValid : function(id, cb) {
        this.getSessionUserId(id, function(_, id) {
            cb(null, id !== null);
        });
    },
    getSessionUserId : function(id, cb) {
        var self = this;
        self._db.query('SELECT `user` FROM `sessions` WHERE `id` = ?', [ id ], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                cb(null, results[0].user);
            } else {
                cb(null, null);
            }
        });
    },
    getSessionUser : function(sessionId, cb) {
        var self = this;
        self.getSessionUserId(sessionId, function(_, userId) {
            if(userId === null) {
                cb(null, null);
            } else {
                self._db.query('SELECT `username` FROM `users` WHERE `id` = ?', [ userId ], function(err, results) {
                    if(err) {
                        throw err;
                    }
                    cb(null, {
                        id : userId,
                        username : results[0].username
                    });
                });
            }
        });
    }
};
module.exports = Login;
