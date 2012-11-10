var fs = require('fs');
var forever = require('forever-monitor');
var cfg = require('./cfg');

var opts =   {
    'silent': true,
    'uid': 'autogen',
    'pidFile': cfg.pid,
    'max': Number.POSITIVE_INFINITY,
    'killTree': true,
    'minUptime': 2000,
    'spinSleepTime': 1000,
    'command': 'node',
    'options': ['-c', cfg.filename],
    'sourceDir': __dirname,
    'watch': false,
    'watchIgnoreDotFiles': null,
    'watchIgnorePatterns': null,
    'watchDirectory': null,
    'spawnWith': {
        customFds: [-1, -1, -1],
        setsid: false
    },
    'env': {},
    'cwd': __dirname + '/../..',
    'logFile': cfg.log.forever,
    'outFile': cfg.log.stdout,
    'errFile': cfg.log.stderr
};
new forever.Monitor('server.js', opts).start();
