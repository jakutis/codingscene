var a = require('async');
var v = require('valentine');
var fs = require('fs');
var c = require('./common');

var dir = __dirname + '/../templates';

var listFiles = function(dir, cb) {
    a.waterfall([function(cb) {
        fs.readdir(dir, cb);
    }, function(files, cb) {
        var groups = {
            dir : [],
            html : []
        };
        v.each(files, function(file) {
            var dot = file.lastIndexOf('.');
            if(dot < 0) {
                groups.dir.push(file);
            } else if(file.substr(dot) === '.html') {
                groups.html.push({
                    full : file,
                    base : file.substr(0, dot)
                });
            } else {
                groups.dir.push(file);
            }
        });
        cb(null, groups);
    }], cb);
};

var compileDir = function(dir, cb) {
    a.waterfall([function(cb) {
        listFiles(dir, cb);
    }, function(groups, cb) {
        a.map(groups.html, function(html, cb) {
            fs.readFile(dir + '/' + html.full, function(err, contents) {
                cb(null, {
                    key : html.base,
                    value : contents.toString()
                });
            });
        }, cb);
    }, function(templates, cb) {
        var json = {};
        v.each(templates, function(t) {
            json[t.key] = t.value;
        });
        cb(null, json);
    }], cb);
};

var compile = function() {
    var common = {};
    a.waterfall([v.curry(listFiles, dir), function(groups, cb) {
        a.map(groups.html, function(html, cb) {
            fs.readFile(dir + '/' + html.full, cb);
        }, c.cully(cb, groups));
    }, function(contents, groups, cb) {
        var json = {};
        v.each(contents, function(contents, i) {
            json[groups.html[i].base] = contents.toString();
        });
        console.log('writing common.json');
        fs.writeFile(__dirname + '/../public_html/json/templates/common.json', JSON.stringify(json), c.cully(cb, groups.dir));
    }, function(locales, cb) {
        a.map(locales, function(locale, cb) {
            compileDir(dir + '/' + locale, cb);
        }, c.cully(cb, locales));
    }, function(jsons, locales, cb) {
        a.forEach(v.map(locales, function(locale, i) {
            return {
                locale : locale,
                json : JSON.stringify(jsons[i])
            };
        }), function(item, cb) {
            console.log('writing ' + item.locale + '.json');
            fs.writeFile(__dirname + '/../public_html/json/templates/' + item.locale + '.json', item.json, cb);
        }, cb);
    }]);
};

compile();
if(process.argv[2] === 'watch') {
    c.onchange(dir, '.html', compile);
}

