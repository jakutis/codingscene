var v = require('valentine');
var UserTracker = function(logger, login, sio) {
    this._logger = logger;
    this._login = login;
    this._userToSessions = {};
    this._sio = sio;
    this.users = {};
};
UserTracker.prototype = {
    _logger : null,
    _login : null,
    _userToSessions : null,
    _sio : null,
    online : 0,
    registered : 0,
    users : null,
    remove : function(username, session) {
        if(this._userToSessions[username].length === 1) {
            this.online -= 1;
            this.users[username].online = false;
        }
        this._userToSessions[username].splice(this._userToSessions[username].indexOf(session), 1);
        this._sio.sockets.emit('userOffline', null, {
            username : username,
            codersonline : this.online
        });
    },
    add : function(username, session) {
        if(typeof this._userToSessions[username] === 'undefined') {
            this._userToSessions[username] = [];
        }

        this._userToSessions[username].push(session);
        if(this._userToSessions[username].length === 1) {
            this.online += 1;
            this.users[username].online = true;
            this._sio.sockets.emit('userOnline', null, {
                username : username,
                codersonline : this.online
            });
        }
    },
    init : function(cb) {
        var self = this;
        self._logger.info('fillUsers', 'begin');
        self._login.getUsers(function(_, u) {
            self.registered = u.length;
            v.each(u, function(user) {
                self.users[user.username] = user;
                user.online = false;
            });
            self._logger.info('fillUsers', 'end', self.users.length);
            cb();
        });

    }
};

module.exports = UserTracker;
