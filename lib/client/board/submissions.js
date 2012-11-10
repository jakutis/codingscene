var bonzo = require('bonzo');
var qwery = require('qwery');
var bean = require('bean');
var a = require('async');
var moment = require('moment');
var v = require('valentine');
var SubmissionsWidget = require('./SubmissionsWidget');
var w = require('../window');
exports.init = function(page, t, cb) {
    page.handle(/^\/event\/([^\/]+)\/submissions\/([^\/]+)$/, function(from, to, eventId, taskId) {
        page.beforego(function(from, to) {
            page.body.empty();
        });
        eventId = parseInt(eventId, 10);
        taskId = parseInt(taskId, 10);
        a.auto({
            events : function(cb) {
                page.req('/getEventTasks', eventId, cb);
            },
            tasks : function(cb) {
                page.req('/getUserEvents', page.getId(), cb);
            },
            s : function(cb) {
                page.req('/getSubmissions', {
                    taskId : taskId,
                    username : null
                }, cb);
            }
        }, function(err, results) {
            if(err) {
                throw err;
            }
            var events = results.events;
            var tasks = results.tasks;
            var s = results.s;
            events = v.filter(events, function(event) {
                return event.taskIds.length > 0 && event.activities.length > 0;
            });
            v.each(events, function(event) {
                var date = new Date(event.activities[event.activities.length - 1].from * 1000);
                event.date = moment(date).format('YYYY-MM-DD');
            });
            v.each(tasks, function(task) {
                task.active = task.id === taskId;
                if(task.submissionsCount === 0) {
                    delete task.submissionsCount;
                }
            });
            page.body.append(t.submissions({
                eventId : eventId,
                taskId : taskId,
                username : page.getUser().username,
                tasks : tasks,
                events : events
            }));
            var select = bonzo(qwery('select'));
            select.val(String(eventId));
            bean.add(select[0], 'change', function() {
                var eventId = parseInt(select.val(), 10);
                page.go('/event/' + eventId + '/submissions/' + v.find(events, function(event) {
                    if(event.id === eventId) {
                        return true;
                    }
                }).taskIds[0]);
            });
            var submissions = new SubmissionsWidget().init(w.el('submissions'), page, {
                showUsernames : true
            });
            v.each(s, v.bind(submissions, submissions.add));
        });
    });
    cb(null);
};
