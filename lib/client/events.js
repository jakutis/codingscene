var marked = require('marked');
var moment = require('moment');
var bean = require('bean');
var bonzo = require('bonzo');
var qwery = require('qwery');
var v = require('valentine');
var cfg = require('./cfg');
var util = require('../util');
var registration = require('./registration');

exports.init = function(page, t, cb) {
    page.handle(/^\/$/, function(from, to) {
        if(page.getUser() === null) {
            registration.handle(page, t, from);
        } else {
            page.req('/getUserEvents', page.getId(), function(err, events) {
                if(err) {
                    throw err;
                }
                v.each(events, function(event) {
                    if(event.activities.length > 0) {
                        var date = new Date(event.activities[event.activities.length - 1].from * 1000);
                        event.passed = date.getTime() < new Date().getTime();
                        event.dateObj = date;
                        event.date = moment(date).format('YYYY-MM-DD');
                        v.each(event.activities, function(activity) {
                            activity.title = marked(activity.title);
                        });
                        event.activities.sort(function(a, b) {
                            return a.from - b.from;
                        });
                    }
                    event.participants = util.values(event.participants);
                    v.each(event.participants, function(participant) {
                        participant.admin = cfg.rootUserId === page.getUser().id;
                    });
                    v.each(event.activities, function(activity) {
                        activity.from = moment(activity.from * 1000).format('HH:mm');
                        activity.to = moment(activity.to * 1000).format('HH:mm');
                    });
                    event.username = page.getUser().username;
                    event.taskId = event.taskIds.length > 0 ? event.taskIds[0] : null;
                });
                events.sort(function(a, b) {
                    if(typeof a.dateObj === 'undefined') {
                        return -1;
                    }
                    if(typeof b.dateObj === 'undefined') {
                        return 1;
                    }
                    return b.dateObj.getTime() - a.dateObj.getTime();
                });
                page.body.append(t.events({
                    baseurl : cfg.baseurl,
                    events : events
                }));
                v.each(qwery('.arrivedSwitch'), function(button) {
                    var eventId = bonzo(button.parentNode).attr('id').substr('participant-'.length).split('-');
                    var username = eventId[1];
                    eventId = parseInt(eventId[0], 10);
                    button = bonzo(button);
                    bean.add(button[0], 'click', function() {
                        console.log(button.data('arrived'));
                        if(button.data('arrived')) {
                            page.emit('arrived', null, {
                                sessionId : page.getId(),
                                eventId : eventId,
                                username : username,
                                arrived : false
                            });
                            button.text('Did not arrive').removeClass('btn-inverse');
                        } else {
                            page.emit('arrived', null, {
                                sessionId : page.getId(),
                                eventId : eventId,
                                username : username,
                                arrived : true
                            });
                            button.text('Arrived').addClass('btn-inverse');
                        }
                        button.data('arrived', !button.data('arrived'));
                    });
                });
                page.beforego(function(from, to) {
                    page.body.empty();
                });

                v.each(qwery('.rsvp'), function(button) {
                    button = bonzo(button);
                    bean.add(button[0], 'click', function() {
                        var eventId = button.data('event');
                        var username = page.getUser().username;
                        if(button.data('participated')) {
                            button.removeClass('btn-inverse');
                            button.text('You are not going');
                            button.data('participated', false);
                            bonzo(qwery('#participant-' + eventId + '-' + username)).remove();
                            page.emit('rsvp', null, {
                                sessionId : page.getId(),
                                event : eventId,
                                participated : false
                            });
                        } else {
                            button.addClass('btn-inverse');
                            button.text('You are going');
                            button.data('participated', true);
                            var p = bonzo.create('<p id="participant-' + eventId + '-' + username + '"><a href="/member/' + username + '">' + username + '</a></p>');
                            bonzo(qwery('#event-' + eventId + ' .participants')).append(p);
                            page.emit('rsvp', null, {
                                sessionId : page.getId(),
                                event : eventId,
                                participated : true
                            });
                        }
                    });
                });
            });
        }
    });
    cb(null);
};
