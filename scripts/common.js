var fs = require('fs');
var a = require('async');

var rdirs = function(dir, cb) {
    a.waterfall([function(cb) {
        fs.readdir(dir, cb);
    }, function(files, cb) {
        a.map(files, function(file, cb) {
            cb(null, dir + '/' + file);
        }, cb);
    }, function(files, cb) {
        a.map(files, function(file, cb) {
            fs.stat(file, function(err, stats) {
                cb(err, {
                    name : file,
                    stats : stats
                });
            });
        }, cb);
    }, function(files, cb) {
        a.filter(files, function(file, cb) {
            cb(file.stats.isDirectory());
        }, function(files) {
            cb(null, files);
        });
    }, function(dirs, cb) {
        a.map(dirs, function(dir, cb) {
            cb(null, dir.name);
        }, cb);
    }, function(dirs, cb) {
        a.concat(dirs, rdirs, cb);
    }], function(err, dirs) {
        if(err) {
            cb(err, null);
            return;
        }
        dirs.unshift(dir);
        cb(null, dirs);
    });
};
exports.onchange = function(dir, suffix, cb) {
    var watchers = [];
    var watchDir = function(dir, allWatchedDirs) {
        console.log('watchDir', dir);
        var lastMtimes = {};
        var watcher = fs.watch(dir, function(type, filename) {
            var fullfilename = dir + '/' + filename;
            fs.stat(fullfilename, function(err, stats) {
                if(err) {
                    return;
                }
                if(stats.isDirectory()) {
                    rewatch();
                    return;
                }
                if(type !== 'change' || filename.substr(filename.length - suffix.length) !== suffix) {
                    return;
                }
                if(lastMtimes[filename] === stats.mtime.getTime()) {
                    return;
                }
                lastMtimes[filename] = stats.mtime.getTime();
                console.log('recompile', 'triggered by', fullfilename);
                cb();
            });
        });
        watchers.push(watcher);
    };
    var rewatch = function() {
        a.waterfall([function(cb) {
            a.forEach(watchers, function(watcher, cb) {
                watcher.close();
                cb(null);
            }, cb);
        }, function(cb) {
            watchers = [];
            rdirs(dir, cb);
        }, function(dirs, cb) {
            a.forEach(dirs, function(dir, cb) {
                watchDir(dir, dirs);
                cb(null);
            }, cb);
        }], function(err) {
            if(err) {
                throw err;
            }
        });
    };
    rewatch();
};
var slice = [].slice;
exports.cully = function(fn) {
    if(arguments.length === 1) {
        return fn;
    }
    var args = slice.call(arguments, 1);
    return function() {
        return fn.apply(null, slice.call(arguments).concat(args));
    };
};
