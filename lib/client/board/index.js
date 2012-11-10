var window = require('../window');
var bean = require('bean');
var moment = require('moment');
var a = require('async');
var v = require('valentine');
var bonzo = require('bonzo');
var qwery = require('qwery');
var util = require('../../util');
var editorModule = require('./editor');

exports.init = function(page, t, cb) {
    page.handle(/^\/event\/([^\/]+)$/, function(from, to, eventId) {
        if(page.getUser() === null) {
            page.go('/login');
        } else {
            page.req('/getEventTasks', eventId, function(err, tasks) {
                page.go('/event/' + eventId + '/editor/' + page.getUser().username + '/' + tasks[0].id);
            });
        }
    });
    page.handle(/^\/event\/([^\/]+)\/editor\/([^\/]+)\/([^\/]+)$/, function(from, to, eventId, username, taskId) {
        if(page.getUser() === null) {
            page.go('/');
            return;
        }
        eventId = parseInt(eventId, 10);
        taskId = parseInt(taskId, 10);
        var offlineUsers, onlineUsers, editor;
        a.auto({
            tasks : function(cb) {
                page.req('/getEventTasks', eventId, cb);
            },
            events : function(cb) {
                page.req('/getUserEvents', page.getId(), cb);
            },
            users : function(cb) {
                page.req('/getUsers', page.getId(), cb);
            }
        }, function(err, results) {
            if(err) {
                throw err;
            }
            var users = results.users;
            var getUserToggle = function(username) {
                return window.el('usertoggle-' + username);
            };
            var unOnline = page.on('userOnline', function(_, msg) {
                if(users[msg.username]) {
                    users[msg.username].online = true;
                    bonzo(qwery('#usertoggle-' + msg.username + ' i')).removeClass('hidden');
                    var user = null;
                    var toggle = getUserToggle(msg.username);
                    var parentNode = toggle[0].parentNode;
                    toggle.remove();
                    var i;
                    for(i = 0; i < offlineUsers.length; i+=1) {
                        if(offlineUsers[i].username === msg.username) {
                            user = offlineUsers[i];
                            offlineUsers.splice(i, 1);
                            break;
                        }
                    }
                    for(i = 0; i < onlineUsers.length; i+=1) {
                        if(onlineUsers[i].username >= msg.username) {
                            toggle.insertBefore(getUserToggle(onlineUsers[i].username).parent());
                            addUserToggleListener(toggle[0].childNodes[0]);
                            onlineUsers.splice(i, 0, user);
                            user = null;
                            break;
                        }
                    }
                    if(user !== null) {
                        onlineUsers.push(user);
                        toggle.insertAfter(getUserToggle(onlineUsers[onlineUsers.length - 1].username).parent());
                        addUserToggleListener(toggle[0].childNodes[0]);
                    }
                }
            });
            var unOffline = page.on('userOffline', function(_, msg) {
                if(users[msg.username]) {
                    users[msg.username].online = false;
                    bonzo(qwery('#usertoggle-' + msg.username + ' i')).addClass('hidden');
                    var user = null;
                    var toggle = getUserToggle(msg.username);
                    var parentNode = toggle[0].parentNode;
                    toggle.remove();
                    var i;
                    for(i = 0; i < onlineUsers.length; i+=1) {
                        if(onlineUsers[i].username === msg.username) {
                            user = onlineUsers[i];
                            onlineUsers.splice(i, 1);
                            break;
                        }
                    }
                    for(i = 0; i < offlineUsers.length; i+=1) {
                        if(offlineUsers[i].username >= msg.username) {
                            toggle.insertBefore(getUserToggle(offlineUsers[i].username));
                            addUserToggleListener(toggle[0].childNodes[0]);
                            offlineUsers.splice(i, 0, user);
                            user = null;
                            break;
                        }
                    }
                    if(user !== null) {
                        offlineUsers.push(user);
                        parentNode.appendChild(toggle[0]);
                        addUserToggleListener(toggle[0].childNodes[0]);
                    }
                }
            });
            var addUserToggleListener = function(a) {
                bean.add(a, 'click', function(e) {
                    e.preventDefault();
                    var solution = editor.getSolution();
                    bonzo(window.el('usertoggle-' + username).parent()).removeClass('active');
                    username = bonzo(a).attr('id').substr('usertoggle-'.length);
                    solution.username = username;
                    bonzo(window.el('usertoggle-' + username).parent()).addClass('active');
                    page.rewrite('/event/' + eventId + '/editor/' + username + '/' + taskId);
                    editor.setSolution(solution);
                });
            };
            var addTaskToggleListener = function(a) {
                bean.add(a, 'click', function(e) {
                    e.preventDefault();
                    var solution = editor.getSolution();
                    bonzo(window.el('tasktoggle-' + taskId).parent()).removeClass('active');
                    taskId = parseInt(bonzo(a).attr('id').substr('tasktoggle-'.length), 10);
                    window.el('submissions-link').attr('href', '/event/' + eventId + '/submissions/' + taskId);
                    solution.taskId = taskId;
                    bonzo(window.el('tasktoggle-' + taskId).parent()).addClass('active');
                    page.rewrite('/event/' + eventId + '/editor/' + username + '/' + taskId);
                    editor.setSolution(solution);
                });
            };
            var compareUsers = function(a, b) {
                return a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1;
            };
            var init = function() {
                results.events = v.filter(results.events, function(event) {
                    return event.taskIds.length > 0 && event.activities.length > 0;
                });
                v.each(results.events, function(event) {
                    var date = new Date(event.activities[event.activities.length - 1].from * 1000);
                    event.date = moment(date).format('YYYY-MM-DD');
                });
                onlineUsers = v.filter(util.values(users), function(user) {
                    return user.online;
                });
                onlineUsers.sort(compareUsers);
                offlineUsers = v.filter(util.values(users), function(user) {
                    return !user.online;
                });
                offlineUsers.sort(compareUsers);
                var usersArray = v.merge(onlineUsers.slice(0), offlineUsers);

                page.body.append(t.board({
                    username : username,
                    eventId : eventId,
                    taskId : taskId,
                    users : usersArray,
                    tasks : results.tasks,
                    events : results.events
                }));
                page.beforego(function(from, to) {
                    unOnline();
                    unOffline();
                    page.body.empty();
                });
                v.each(onlineUsers, function(user) {
                    bonzo(qwery('#usertoggle-' + user.username + ' i')).removeClass('hidden');
                });
                v.each(qwery('.usertoggle'), addUserToggleListener);
                v.each(qwery('.tasktoggle'), addTaskToggleListener);
                var select = bonzo(qwery('select'));
                select.val(String(eventId));
                bean.add(select[0], 'change', function() {
                    var eventId = parseInt(select.val(), 10);
                    page.go('/event/' + eventId + '/editor/' + username + '/' + v.find(results.events, function(event) {
                        if(event.id === eventId) {
                            return true;
                        }
                    }).taskIds[0]);
                });
                editor = editorModule.init(page, results.tasks);

                if(usersArray.length > 0 && results.tasks.length > 0) {
                    bonzo(qwery('#usertoggle-' + username)[0].parentNode).addClass('active');
                    bonzo(qwery('#tasktoggle-' + taskId)[0].parentNode).addClass('active');
                    editor.setSolution({
                        username : username,
                        taskId : taskId,
                        eventId : eventId
                    });
                }
            };
            init();
        });
    });
    cb(null);
};
