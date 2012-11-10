var util = require('../util');
var cfg = require('./cfg');
var a = require('async');
var reqwest = require('reqwest');
var v = require('valentine');
var store = require('./store');

var Templates = function() {
};

Templates.prototype = {
    templates : null,
    _locale : null,
    _namespace : null,
    _noCache : null,
    init : function(namespace, locale, noCache, cb) {
        var self = this;
        self.templates = {};
        self._noCache = noCache;
        self._namespace = namespace;
        self._fillTemplates('common', function(err) {
            if(err) {
                cb(err);
                return;
            }
            self.setLocale(locale, cb);
        });
        return self;
    },
    setLocale : function(locale, cb) {
        var self = this;
        self._fillTemplates(locale, function(err, templates) {
            if(err) {
                cb(err);
                return;
            }
            self._locale = locale;
            cb(null);
        });
        return self;
    },
    getLocale : function(cb) {
        var self = this;
        cb(null, self._locale);
    },
    _fillTemplates : function(file, cb) {
        var self = this;

        a.waterfall([function(cb) {
            store.get(self._namespace + '.' + file + '.version', cb);
        }, function(v, cb) {
            if(v !== cfg.version.hash || self._noCache) {
                reqwest({
                    url : '/json/templates/' + file + '.json?' + cfg.version.hash + (self._noCache ? String(Math.random()) : ''),
                    method : 'get',
                    type : 'json',
                    contentType: 'application/json',
                    error : function(xhr) {
                        cb(xhr, null);
                    },
                    success : function(templates) {
                        store.set(self._namespace + '.' + file, templates, function() {
                            store.set(self._namespace + '.' + file + '.version', cfg.version, function() {
                                cb(null, templates);
                            });
                        });
                    }
                });
            } else {
                store.get(self._namespace + '.' + file, cb);
            }
        }, function(templates, cb) {
            util.compileTemplates(templates, self.templates);
            cb(null);
        }], cb);
    }
};

module.exports = Templates;
