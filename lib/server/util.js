var cookie = require('cookie');
var crypto = require('crypto');

exports.sendSessionId = function(res, sessionId) {
    if(sessionId === null) {
        var exp = new Date();
        exp.setDate(exp.getDate() - 1);
        res.header('Set-Cookie', cookie.serialize('sessionId', '', {
            path : '/',
            expires : exp
        }));
    } else {
        res.header('Set-Cookie', cookie.serialize('sessionId', sessionId, {
            path : '/'
        }));
    }
};

exports.generateHash = function(db, query, salt, cb) {
    crypto.randomBytes(1024, function(err, random) {
        var h = exports.hash(random, salt);
        db.query(query, [ h ], function(err, results) {
            if(err) {
                throw err;
            }
            if(results[0].count > 0) {
                exports.generateHash(db, query, salt, cb);
            } else {
                cb(null, h);
            }
        });
    });
};

exports.hash = function(buffer, salt) {
    var hash = crypto.createHash('sha512');
    hash.update(salt);
    hash.update(buffer);
    return hash.digest('base64');
};

exports.parseSessionId = function(req) {
    var cookies = req.header('Cookie');
    if(typeof cookies === 'string') {
        cookies = cookie.parse(cookies);
        if(typeof cookies.sessionId === 'string') {
            return cookies.sessionId;
        } else {
            return null;
        }
    } else {
        return null;
    }
};

exports.notFound = function(user, res, ccfg, t) {
    res.send(t.layout({
        status : 404,
        baseurl : ccfg.baseurl,
        body : t.notFound(),
        loginbar : (user === null ? t.loginbarGuest({
            baseurl : ccfg.baseurl
        }) : t.loginbarMember({
            user : user,
            baseurl : ccfg.baseurl
        }))
    }));
};
