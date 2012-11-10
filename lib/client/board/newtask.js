var bean = require('bean');
var marked = require('marked');
var w = require('../window');
var common = require('../common');
exports.init = function(page, t, cb) {
    page.handle(/^\/event\/([^\/]+)\/newtask$/, function(from, to, eventId) {
        eventId = parseInt(eventId, 10);
        page.beforego(function(from, to) {
            page.body.empty();
        });
        page.body.append(t.newtask({
            eventId : eventId
        }, t));
        var titleEl = w.el('title');
        var descriptionEl = w.el('description');
        var badgeEl = w.el('badge');
        bean.add(descriptionEl[0], common.changeEvents, function() {
            w.el('descriptionPreview').html(marked(descriptionEl.val()));
        });
        bean.add(w.el('taskForm')[0], 'submit', function(e) {
            e.preventDefault();
            var task = {
                eventId : eventId,
                description : descriptionEl.val(),
                title : titleEl.val()
            };
            page.emit('addTask', null, {
                sessionId : page.getId(),
                task : task
            });
            common.blink(badgeEl);
        });
    });
    cb(null);
};
