var a = require('async');
var v = require('valentine');
var cfg = require('./cfg');

exports.init = function(page, t, cb) {
    page.handle(/^\/members$/, function(from, to) {
        page.req('/getUsers', page.getId(), function(err, users) {
            if(err) {
                throw err;
            }
            users = v.map(users, function(username, user) {
                user.hasTwitter = user.twitter.length > 0;
                return user;
            });

            page.body.append(t.members({
                baseurl : cfg.baseurl,
                members : users
            }));
            page.beforego(function(from, to) {
                page.body.empty();
            });
        });
    });
    cb(null);
};
