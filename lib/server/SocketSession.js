var SocketSession = function(socket, sio, logger, userTracker) {
    this._socket = socket;
    this._sio = sio;
    this._logger = logger;
    this._userTracker = userTracker;
};
SocketSession.prototype = {
    _socket : null,
    _sio : null,
    _logger : null,
    _user : null,
    _userTracker : null,
    end : function() {
        var self = this;
        self._logger.info('SocketSession.stop', self._user);
        if(self._user !== null) {
            self._userTracker.remove(self._user.username, self);
            self._user = null;
        }
    },
    start : function(u) {
        var self = this;
        self._logger.info('SocketSession.start', self._user, u);
        if(u !== null) {
            self._user = u;
            self._userTracker.add(self._user.username, self);
        }
    },
    on : function(event, handler) {
        var self = this;
        self._socket.on(event, function(err, msg) {
            self._logger.info('SocketSession.on', self._user, event, err, msg);
            handler(err, msg);
        });
    },
    emitAll : function(event, err, msg) {
        var self = this;
        self._logger.info('SocketSession.emitAll', self._user, event, err, msg);
        self._sio.sockets.emit(event, err, msg);
    },
    emit : function(event, err, msg) {
        var self = this;
        self._logger.info('SocketSession.emit', self._user, event, err, msg);
        self._socket.emit(event, err, msg);
    }
};

module.exports = SocketSession;
