var cfg = require('./cfg');
var marked = require('marked');
var w = require('./window');
var common = require('./common');
var bean = require('bean');
var v = require('valentine');

exports.init = function(page, t, cb) {
    page.handle(/^\/members\/mail$/, function(from, to) {
        page.body.append(t.mail({
            baseurl : cfg.baseurl
        }));
        var emailsEl = w.el('emails');
        var subjectEl = w.el('subject');
        var textEl = w.el('text');
        var badgeEl = w.el('badge');
        bean.add(textEl[0], common.changeEvents, function() {
            w.el('textPreview').html(marked(textEl.val()));
        });
        bean.add(w.el('mailForm')[0], 'submit', function(e) {
            e.preventDefault();
            var mail = {
                subject : subjectEl.val(),
                emails : v.reject(v.map(emailsEl.val().split(','), v.trim), v.is.emp),
                text : textEl.val()
            };
            page.emit('mailAll', null, {
                sessionId : page.getId(),
                mail : mail
            });
            common.blink(badgeEl);
        });
        page.beforego(function(from, to) {
            page.body.empty();
        });
    });
    cb(null);
};
