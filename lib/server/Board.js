var v = require('valentine');
var a = require('async');
var DMP = require('../diff_match_patch_20120106/javascript/diff_match_patch_uncompressed');
var DMP = DMP.diff_match_patch;
var util = require('./util');
var cutil = require('../util');

var dmp = new DMP();

var Board = function() {
};
Board.prototype = {
    _db : null,
    _logger : null,
    init : function(logger, db) {
        this._db = db;
        this._logger = logger;
        return this;
    },
    patchSolution : function(userId, taskId, patch, cb) {
        var self = this;
        self._logger.info('Board.patchSolution', userId, taskId, patch);
        self._db.query('SELECT `id`, `description` FROM `solutions` WHERE `task` = ? AND `user` = ?', [taskId, userId], function(err, results) {
            if(err) {
                throw err;
            }
            var description;
            if(results.length === 0) {
                self._logger.info('Board.patchSolution', 'insert');
                description = '';
                description = dmp.patch_apply(patch, description);
                description = description[0];
                self._db.query('SELECT COUNT(`id`) as `count` FROM `tasks` WHERE `id` = ?', [taskId], function(err, results) {
                    if(err) {
                        throw err;
                    }
                    self._logger.info('Board.patchSolution', 'task ok');
                    if(results[0].count === '1') {
                        self._db.query('INSERT INTO `solutions` VALUES(NULL, ?, ?, ?, 0)', [taskId, userId, description], function(err, results) {
                            if(err) {
                                throw err;
                            }
                            self._logger.info('Board.patchSolution', 'inserted');
                            cb(null);
                        });
                    }
                });
            } else {
                self._logger.info('Board.patchSolution', 'update');
                description = results[0].description;
                description = dmp.patch_apply(patch, description);
                description = description[0];
                self._db.query('UPDATE `solutions` SET `description` = ? WHERE `id` = ?', [description, results[0].id], function(err, results) {
                    if(err) {
                        throw err;
                    }
                    self._logger.info('Board.patchSolution', 'updated');
                    cb(null);
                });
            }
        });
    },
    addTask : function(task, userId) {
        var self = this;
        self._db.query('SELECT `owner` FROM `events` WHERE `id` = ?', [task.eventId], function(err, results) {
            if(err) {
                throw err;
            }
            console.log('addTask', task, userId, results);
            if(results[0].owner === userId) {
                self._db.query('INSERT INTO `tasks` VALUES(NULL, ?, ?, ?)', [task.eventId, task.title, task.description]);
            }
        });
    },
    putReview : function(review, userId) {
        var self = this;
        self._db.query('UPDATE `reviews` SET `description` = ? WHERE `line` = ? AND `submission` = ? AND `user` = ?', [review.description, review.line, review.submission, userId], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.affectedRows === 0) {
                self._db.query('INSERT INTO `reviews` VALUES (NULL, ?, ?, ?, ?)', [review.submission, review.line, userId, review.description], function(err, results) {
                    if(err) {
                        throw err;
                    }
                });
            }
        });
    },
    getSubmissions : function(taskId, username, cb) {
        var self = this;
        var query = 'SELECT `submissions`.`id`, `submissions`.`time`, `submissions`.`description`, `users`.`username` FROM `submissions`, `users` WHERE `users`.`id` = `submissions`.`user` AND';
        if(username === null) {
            query += ' `submissions`.`task` = ?';
        } else {
            query += ' `submissions`.`task` = ? AND `users`.`username` = ?';
        }
        self._db.query(query, [taskId, username], function(err, submissions) {
            if(err) {
                cb(err);
                return;
            }
            self._logger.info('results', submissions);
            a.map(submissions, function(submission, cb) {
                submission.reviews = [];
                v.each(submission.description.split('\n'), function(_, n) {
                    submission.reviews.push([]);
                });
                self._db.query('SELECT `reviews`.`id`, `reviews`.`submission`, `reviews`.`line`, `users`.`username`, `reviews`.`description` FROM `reviews`, `users` WHERE `users`.`id` = `reviews`.`user` AND `reviews`.`submission` = ?', [submission.id], function(err, reviews) {
                    if(err) {
                        cb(err);
                        return;
                    }
                    v.each(reviews, function(review) {
                        submission.reviews[review.line].push(review);
                    });
                    cb(null, submission);
                });
            }, cb);
        });
    },
    openSolution : function(userId, taskId) {
        var self = this;
        self._db.query('UPDATE `solutions` SET `opened` = ? WHERE task = ? AND user = ?', [cutil.now(), taskId, userId], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.affectedRows === 0) {
                self._db.query('INSERT INTO `solutions` VALUES(NULL, ?, ?, ?, ?)', [taskId, userId, '', cutil.now()]);
            }
        });
    },
    submitSolution : function(submission, cb) {
        var self = this;
        self._db.query('INSERT INTO `submissions` VALUES(NULL, ?, ?, ?, ?)', [submission.userId, submission.taskId, cutil.now(), submission.description], function(err, results) {
            if(err) {
                throw err;
            }
            cb(null, results.insertId);
        });
    },
    getSolution : function(taskId, username, cb) {
        var self = this;
        self._db.query('SELECT `solutions`.`description`, `solutions`.`opened` FROM `solutions`, `users` WHERE `solutions`.`task` = ? AND `users`.`username` = ? AND `solutions`.`user` = `users`.`id`', [taskId, username], function(err, results) {
            if(err) {
                throw err;
            }
            if(results.length > 0) {
                var solution = results[0];
                solution.finished = solution.finished === 0 ? null : solution.finished;
                solution.opened = solution.opened === 0 ? null : solution.opened;
                solution.taskId = taskId;
                solution.username = username;
                cb(null, solution);
            } else {
                cb(null, {
                    finished : null,
                    opened : null,
                    description : '',
                    taskId : taskId,
                    username : username
                });
            }
        });
    },
    getEventTasks : function(eventId, cb) {
        var self = this;
        self._db.query('SELECT `tasks`.`id`, `tasks`.`title`, `tasks`.`description`, COUNT(`submissions`.`id`) as `submissionsCount` FROM `tasks` LEFT JOIN `submissions` ON `submissions`.`task` = `tasks`.`id` WHERE `tasks`.`event` = ? GROUP BY `tasks`.`id`', [eventId], function(err, tasks) {
            if(err) {//
                throw err;
            }
            v.each(tasks, function(task) {
                task.id = parseInt(task.id, 10);
                task.submissionsCount = parseInt(task.submissionsCount, 10);
            });
            cb(null, tasks);
        });
    }
};
module.exports = Board;
