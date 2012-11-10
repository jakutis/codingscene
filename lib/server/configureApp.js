var fs = require('fs');
var connect = require('connect');
var express = require('express');
var cookie = require('cookie');
var util = require('../util');
var uglify = require('uglify-js');
var engines = require('consolidate');

module.exports = function(app, logger, cfg, t) {
    fs.writeFileSync(__dirname + '/../client/cfg.js', 'module.exports=' + JSON.stringify(cfg.client) + ';');
    var browserify = require('browserify')(__dirname + '/../browserify.js', {
        debug : cfg.browserifyDebug
    });
    browserify = {
        src : browserify.bundle() + fs.readFileSync(__dirname + '/../../ace/build/src-noconflict/ace.js')
    };
    var ast = uglify.parser.parse(browserify.src);
    ast = uglify.uglify.ast_mangle(ast, {
        mangle : true,
        toplevel : false,
        defines : {},
        except : null,
        no_functions : false
    });
    ast = uglify.uglify.ast_squeeze(ast, {
        make_seqs : true,
        dead_code : true,
        keep_comps : true,
        unsafe : false
    });
    browserify.minsrc = uglify.uglify.gen_code(ast, {
        ascii_only: false,
        beautify: false,
        indent_level: 4,
        indent_start: 0,
        quote_keys: false,
        space_colon: false,
        inline_script: false
    });

    app.configure(function() {
        logger.info('app.use');
        app.use(function(req, res, next) {
            res.removeHeader('X-Powered-By');
            req.url = req.path;
            next();
        });

        app.use(express.compress());
        app.use(express['static'](__dirname + '/../../public_html'));

        app.use(express.bodyParser({
            // client needs to send bare strings and even nulls
            strict : false
        }));

        app.use(function(req, res, next) {
            req.cookies = req.header('Cookie');
            if(typeof req.cookies === 'string') {
                try {
                    req.cookies = cookie.parse(req.cookies);
                } catch(e) {
                    req.cookies = {};
                }
            } else {
                req.cookies = {};
            }
            next();
        });

        app.use(function(req, res, next) {
            logger.info('REQUEST', req.method, req.url, req.cookies);
            req.sessionId = typeof req.cookies.sessionId === 'undefined' ? null : req.cookies.sessionId;
            next();
        });

        app.use(function(req, res, next) {
            if(util.startsWith(req.url, '/script')) {
                if(util.startsWith(req.url, '/script/index.js')) {
                    res.statusCode = 200;
                    res.setHeader('content-type', 'text/javascript');
                    if(typeof req.cookies.debug === 'undefined') {
                        res.setHeader('last-modified', cfg.client.version.date);
                        res.end(browserify.minsrc);
                    } else {
                        res.setHeader('last-modified', new Date());
                        res.end(browserify.src);
                    }
                } else if(typeof req.cookies.script === 'undefined') {
                    res.send(t.cookies({
                        baseurl : cfg.client.baseurl
                    }));
                } else {
                    res.header('Set-Cookie', cookie.serialize('script', req.url.charAt('/script/'.length), {
                        path : '/'
                    }));
                    res.redirect(req.url.substr('/script/0'.length));
                }
            } else {
                if(typeof req.cookies.script === 'string') {
                    next();
                } else {
                    res.header('Set-Cookie', cookie.serialize('script', 'testing', {
                        path : '/'
                    }));
                    res.send(t.script({
                        baseurl : cfg.client.baseurl,
                        path : req.url
                    }));
                }
            }
        });
    });
};
