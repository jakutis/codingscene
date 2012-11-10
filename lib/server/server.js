var fs = require('fs');
var nodemailer = require('nodemailer');
var handleSession = require('./handleSession');
var attachAppHandlers = require('./attachAppHandlers');
var configureApp = require('./configureApp');
var Mailer = require('./Mailer');
var UserTracker = require('./UserTracker');
var SocketSession = require('./SocketSession');
var sutil = require('./util');
var util = require('../util');
var express = require('express');
var mysql = require('mysql');
var a = require('async');
var io = require('socket.io');
var log4js = require('log4js');
var Board = require('./Board');
var Login = require('./Login');
var cfg = require('./cfg');

var logger = log4js.getLogger();
logger.setLevel('DEBUG');
logger.info('CodingScene starting with config from ' + cfg.filename);

var ccfg = cfg.client;

var t = {};
util.compileTemplates(JSON.parse(fs.readFileSync(__dirname + '/../../public_html/json/templates/common.json')), t);
// TODO select different language for each client
util.compileTemplates(JSON.parse(fs.readFileSync(__dirname + '/../../public_html/json/templates/en_US.json')), t);

var db = mysql.createConnection({
    host : cfg.db.hostname,
    user : cfg.db.username,
    password : cfg.db.password
});

var app = express();
var server = app.listen(cfg.port, cfg.host);
logger.info('HTTP server is listening on ' + cfg.host + ':' + cfg.port);
var sio = io.listen(server, {
    log : false
});

var mailer;
if(cfg.mail.type === 'smtp') {
    mailer = nodemailer.createTransport('SMTP', {
    host : cfg.mail.hostname,
    secureConnection : true,
    port : 587,
    auth : {
        user : cfg.mail.username,
        pass : cfg.mail.password
    }
});
} else {
    mailer = nodemailer.createTransport("Sendmail", cfg.mail.sendmail);
}
mailer = new Mailer().init(mailer, cfg, logger);

var board = new Board().init(logger, db);

var login = new Login();

var userTracker = new UserTracker(logger, login, sio);

login.init(logger, db, mailer, userTracker, cfg.salt);

var render = function(req, res, user, body) {
    if(body) {
        body = {
            body : body
        };
    }
    res.send(t.layout({
        debug : req.cookies.log === 'yes',
        path : req.url,
        version : cfg.browserifyDebug ? Math.random() : ccfg.version.hash,
        body : body,
        codersonline : userTracker.online,
        codersregistered : userTracker.registered,
        baseurl : ccfg.baseurl,
        blogurl : ccfg.blogurl,
        keywords : ccfg.keywords,
        title : ccfg.title,
        tagline : ccfg.tagline,
        email : ccfg.email,
        loginbar : (user === null ? t.loginbarGuest({
            baseurl : ccfg.baseurl
        }) : t.loginbarMember({
            user : user,
            baseurl : ccfg.baseurl
        }))
    }));
};

a.series([ function(cb) {
    logger.info('Reading version');
    var git = require('child_process').spawn('git', ['log', '-1', '--format="format:%H %cD"'], {
        cwd : __dirname + '/../../..'
    });
    var body = '';
    git.stdout.on('data', function(data) {
        body += data.toString();
    });
    git.on('exit', function(code) {
        if(code === 0) {
            var i = body.indexOf(' ');
            ccfg.version = {
                hash : body.substr(0, i),
                date : new Date(body.substr(i + 1))
            };
            logger.info('Version', ccfg.version);
            cb(null);
        } else {
            ccfg.version = {
                hash : '',
                date : new Date()
            };
            cb(null);
        }
    });
}, function(cb) {
    logger.info('Connecting to database server');
    db.connect(cb);
}, function(cb) {
    logger.info('Selecting database');
    db.query('USE `' + cfg.db.database + '`', [], cb);
}, function(cb) {
    logger.info('Initializing user tracker');
    userTracker.init(cb);
}], function(err) {
    if(err) {
        throw err;
    }
    logger.info('Setting up express and socket.io');
    configureApp(app, logger, cfg, t);
    attachAppHandlers(app, logger, login, userTracker, render, board, cfg, t);
    sio.sockets.on('connection', function(socket) {
        logger.info('New socket connection');
        handleSession(new SocketSession(socket, sio, logger, userTracker), logger, login, board, userTracker, mailer, cfg);
    });
});
