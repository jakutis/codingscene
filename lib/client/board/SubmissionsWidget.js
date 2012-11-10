var bonzo = require('bonzo');
var common = require('../common');
var bean = require('bean');
var v = require('valentine');
var moment = require('moment');
var Delay = require('../../Delay');
var Foldable = require('./Foldable');

var SubmissionsWidget = function() {
};
SubmissionsWidget.prototype = {
    _cfg : null,
    _submissions : null,
    _page : null,
    _el : null
};
SubmissionsWidget.prototype.init = function(el, page, cfg) {
    var self = this;
    self._el = el;
    self.clear();
    self._page = page;
    self._cfg = cfg || {};
    if(typeof self._cfg.showUsernames !== 'boolean') {
        self._cfg.showUsernames = false;
    }
    return self;
};
SubmissionsWidget.prototype.clear = function() {
    var self = this;
    self._el.html('<h2>Submissions</h2><p>None</p>');
    self._submissions = [];
};
var lineOver = function() {
    bonzo(this.childNodes[0]).css('background', '#333').css('color', '#fff');
    bonzo(this.childNodes[1]).css('background', '#333').css('color', '#fff');
};
var lineOut = function() {
    bonzo(this.childNodes[0]).css('background', '#ddd').css('color', '#333');
    bonzo(this.childNodes[1]).css('background', '#fff').css('color', '#333');
};
SubmissionsWidget.prototype.add = function(submission) {
    var self = this;
    var user = self._page.getUser();
    if(self._submissions.length === 0) {
        bonzo(self._el[0].childNodes[1]).remove();
    }
    var headerHTML = '<h3><i></i> ';
    headerHTML += moment(submission.time * 1000).format('YYYY-MM-DD HH:mm');
    if(self._cfg.showUsernames) {
        headerHTML += ' by <a href="/member/' + submission.username + '">' + submission.username + '</a>';
    }
    headerHTML += '</h3>';
    var headingEl = bonzo(bonzo.create(headerHTML));
    self._el.append(headingEl);
    var foldable = new Foldable().init(headingEl, bonzo(headingEl[0].childNodes[0]));
    var submissionTableEl = bonzo(bonzo.create('<table class="submission"><tbody></tbody></table>')).appendTo(self._el);
    submissionTableEl.hide();
    bean.add(foldable, 'open', function() {
        submissionTableEl.show();
    });
    bean.add(foldable, 'close', function() {
        submissionTableEl.hide();
    });
    var submissionEl = bonzo(submissionTableEl[0].childNodes[0]);
    var lines = submission.description.split('\n');
    v.each(lines, function(line, n) {
        var lineEl = bonzo(bonzo.create('<tr><td class="lineno">' + (n + 1) + '</td><td class="linecode"><pre style="border:0;padding:0;margin:0">' + line + '</pre></td></tr>')).appendTo(submissionEl);
        bean.add(lineEl[0], 'mouseover', lineOver);
        bean.add(lineEl[0], 'mouseout', lineOut);
        var reviewEls = {};
        var state = 'blur';
        var addReview = function(review) {
            var reviewEl = bonzo(bonzo.create('<tr><td class="review" colspan="2"><span></span><textarea readonly="readonly"></textarea></td></tr>'));
            reviewEl.insertBefore(lineEl[0]);
            reviewEl = bonzo(reviewEl[0].childNodes[0]);
            bonzo(reviewEl[0].childNodes[0]).html('<a href="/member/' + review.username + '">' + review.username + '</a>');
            var textarea = bonzo(reviewEl[0].childNodes[1]);
            textarea.val(review.description);
            var delay = new Delay();
            var sync = function() {
                self._page.emit('review', null, {
                    sessionId : self._page.getId(),
                    review : {
                        description : textarea.val(),
                        submission : submission.id,
                        line : n
                    }
                });
            };
            bean.add(textarea[0], common.changeEvents, function() {
                delay.set(sync);
                state = 'reviewChange';
            });
            bean.add(textarea[0], 'blur', function() {
                if(state !== 'review') {
                    return;
                }
                state = 'blur';
                if(state === 'reviewChange') {
                    textarea.attr('readonly', 'readonly');
                } else {
                    delete reviewEls[review.username];
                    bonzo(reviewEl[0].parentNode).remove();
                }
            });
            bean.add(textarea[0], 'click', function() {
                if(review.username === user.username) {
                    textarea.removeAttr('readonly');
                    textarea.focus();
                }
            });
            reviewEls[review.username] = reviewEl;
        };
        v.each(submission.reviews[n], addReview);
        bean.add(lineEl[0], 'mousedown', function() {
            state = 'reviewStart';
        });
        bean.add(lineEl[0], 'click', function() {
            state = 'review';
            if(reviewEls[user.username]) {
                state = 'reviewChange';
            } else {
                addReview({
                    username : user.username,
                    description : ''
                });
            }
            var textarea = bonzo(reviewEls[user.username][0].childNodes[1]);
            textarea.removeAttr('readonly');
            textarea.focus();
        });
    });
    self._submissions.push(submission);
};
module.exports = SubmissionsWidget;
