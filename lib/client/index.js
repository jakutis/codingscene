var io = require('socket.io-client');
var Templates = require('./Templates');
var window = require('./window');
// the line below is a hack that fixes socket.io when it chooses some obscure transports
window.window.io = io;
var reqwest = require('reqwest');
var a = require('async');
var domready = require('domready');
var v = require('valentine');
var qwery = require('qwery');
var moment = require('moment');
var bonzo = require('bonzo');
var bean = require('bean');
var navigate = require('navigate');
var cfg = require('./cfg');
var login = require('./login');
var passwordReset = require('./passwordReset');
var board = require('./board');
var registration = require('./registration');
var members = require('./members');
var submissions = require('./board/submissions');
var newtask = require('./board/newtask');
var member = require('./member');
var mail = require('./mail');
var events = require('./events');

console.log('CodingScene', cfg.version);

var degrade = function() {
    window.setCookie('script', '0');
    window.window.location.href = cfg.baseurl + window.getPath();
};

if(typeof window.window.history.pushState === 'undefined') {
    degrade();
} else {
    var socket = io.connect(cfg.websocket, {
        'connect timeout': 1000,
        'reconnection delay': 1000,
        'max reconnection attempts' : 10
    });
    var socketStatus = 'initializing';
    console.log('socket', socketStatus);

    var onSocketFail = function() {
        if(socketStatus !== 'initializing') {
            return;
        }
        socketStatus = 'fail';
        console.log('socket', socketStatus);
        degrade();
    };
    socket.on('error', onSocketFail);
    socket.on('disconnect', onSocketFail);
    socket.on('connect_failed', onSocketFail);
    socket.on('reconnect_failed', onSocketFail);

    var t = new Templates();
    a.parallel([
        domready,
        function(cb) {
            socket.once('connect', cb);
        },
        function(cb) {
            t.init('templates', 'en_US', false, cb);
        }
    ], function(err) {
        if(err) {
            throw err;
        }
        if(socketStatus !== 'initializing') {
            return;
        }
        socketStatus = 'win';
        console.log('socket', socketStatus);

        t = t.templates;
        var nextHandleIsRewrite = false;
        var page = {
            once : function(event, handler) {
                socket.once(event, function(err, msg) {
                    console.log('page.once', event, err, msg);
                    handler(err, msg);
                });
            },
            on : function(event, handler) {
                var handlerWrapper = function(err, msg) {
                    console.log('page.on', event, err, msg);
                    handler(err, msg);
                };
                socket.on(event, handlerWrapper);
                return function() {
                    socket.removeListener(event, handlerWrapper);
                };
            },
            emit : function(event, err, msg) {
                console.log('page.emit', event, err, msg);
                socket.emit(event, err, msg);
            },
            req : function(resource, msg, cb) {
                console.log('page.req', resource, msg);
                reqwest({
                    url : '/api/0' + resource,
                    method : 'post',
                    type : 'json',
                    contentType: 'application/json',
                    data : JSON.stringify(msg),
                    error : function(xhr) {
                        console.log('page.req', 'error', resource, xhr);
                        cb(xhr, null);
                    },
                    success : function(msg) {
                        console.log('page.req', 'success', resource, msg);
                        cb(msg.err, msg.msg);
                    }
                });
            },
            body : bonzo(qwery('#body')[0]),
            _user : null,
            getUser : function() {
                return page._user;
            },
            setUser : function(user) {
                page._user = user;
                if(page._user === null) {
                    bonzo(qwery('#loginbar')[0]).replaceWith(bonzo(bonzo.create(t.loginbarGuest({
                        baseurl : cfg.baseurl
                    })))[0]);
                } else {
                    bonzo(qwery('#loginbar')[0]).replaceWith(bonzo(bonzo.create(t.loginbarMember({
                        baseurl : cfg.baseurl,
                        user : page._user
                    })))[0]);
                    var loginbar = window.el('loginbar');
                    var loginbarclicked = false;
                    bean.add(window.window, 'click', function(e) {
                        if(!loginbarclicked) {
                            loginbar.removeClass('open');
                        }
                        loginbarclicked = false;
                    });
                    bean.add(loginbar[0], 'click', function(e) {
                        loginbarclicked = true;
                        loginbar.toggleClass('open');
                    });
                }
            },
            getId : function() {
                return window.getCookie('sessionId');
            },
            setId : function(id, remember) {
                if(page.getId() !== id) {
                    window.setCookie('sessionId', id, !!remember);
                    if(id === null) {
                        page.emit('endSession', null, null);
                    }
                }
            },
            handle : function(path, cb) {
                console.log('adding handler', path);
                navigate(path, function(args, previousPath, nextPath) {
                    if(nextHandleIsRewrite) {
                        nextHandleIsRewrite = false;
                        return;
                    }
                    setTimeout(function() {
                        console.log('page', path, previousPath, nextPath);
                        if(previousPath !== nextPath) {
                            bean.fire(page, 'page', [previousPath, nextPath]);
                            var newargs = [previousPath, nextPath];
                            newargs.push.apply(newargs, args);
                            cb.apply(null, newargs);
                        }
                    }, 0);
                });
            },
            beforego : function(cb) {
                bean.one(page, 'page', cb);
            },
            rewrite : function(path) {
                nextHandleIsRewrite = true;
                navigate(path);
            },
            go : navigate
        };
        page.on('userRegistered', function(_, msg) {
            bonzo(qwery('#codersregistered')).text(msg.codersregistered);
        });
        page.on('userOffline', function(_, msg) {
            bonzo(qwery('#codersonline')).text(msg.codersonline);
        });
        page.on('userOnline', function(_, msg) {
            bonzo(qwery('#codersonline')).text(msg.codersonline);
        });
        a.parallel([
            function(cb) {
                login.init(page, t, cb);
            },
            function(cb) {
                passwordReset.init(page, t, cb);
            },
            function(cb) {
                registration.init(page, t, cb);
            },
            function(cb) {
                board.init(page, t, cb);
            },
            function(cb) {
                mail.init(page, t, cb);
            },
            function(cb) {
                member.init(page, t, cb);
            },
            function(cb) {
                members.init(page, t, cb);
            },
            function(cb) {
                events.init(page, t, cb);
            },
            function(cb) {
                newtask.init(page, t, cb);
            },
            function(cb) {
                submissions.init(page, t, cb);
            },
            function(cb) {
                if(page.getId() !== null) {
                    page.once('restoreSession', function(_, user) {
                        if(user === null) {
                            page.setId(null);
                        } else {
                            page.setUser(user);
                        }
                        cb(null);
                    });
                    page.emit('restoreSession', null, page.getId());
                } else {
                    cb(null);
                }
            }
        ], function(err) {
            if(err) {
                throw err;
            }

            page.handle(/^\/logout$/, function(from, to) {
                page.setId(null);
                page.setUser(null);
                page.go('/');
            });
            page.handle(/^\/dist/, function(from, to) {
                window.setHref(to);
                page.go(from);
            });
            page.handle(/^\/other$/, function(from, to) {
                page.body.append(t.other());
                page.beforego(function(from, to) {
                    page.body.empty();
                });
            });
            page.handle(/./, function(from, to) {
                page.body.append(t.notFound());
                page.beforego(function(from, to) {
                    page.body.empty();
                });
            });
            navigate(navigate);
            setInterval(function() {
                v.each(qwery('.date'), function(date) {
                    date = bonzo(date);
                    date.text(moment.unix(date.data('timestamp')).fromNow());
                });
            }, 1000);
        });
    });
}
