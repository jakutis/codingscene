var window = require('../window');
var bonzo = require('bonzo');
var common = require('../common');
var util = require('../../util');
var moment = require('moment');
var marked = require('marked');
var qwery = require('qwery');
var bean = require('bean');
var v = require('valentine');
var DMP = require('../../diff_match_patch_20120106/javascript/diff_match_patch_uncompressed');
var DMP = DMP.diff_match_patch;
var dmp = new DMP();
var Delay = require('../../Delay');
var SubmissionsWidget = require('./SubmissionsWidget');
var Foldable = require('./Foldable');

exports.init = function(page, tasks) {
    var taskMap = {};
    v.each(tasks, function(task) {
        taskMap[String(task.id)] = task;
    });
    var editor = {};
    var user = page.getUser();
    var removeHandlePatch = function(){};
    var solution = {
        username : null,
        taskId : null
    };
    var solutionOpened = null;
    editor.getSolution = function() {
        return {
            username : solution.username,
            taskId : solution.taskId
        };
    };
    var contentEl = bonzo(qwery('#content'));
    var headingEl = bonzo(bonzo.create('<h2><i></i> Problem <span class="opened"></span></h2>'));
    contentEl.append(headingEl);
    var foldable = new Foldable().init(headingEl, bonzo(headingEl[0].childNodes[0]));
    var openedEl = bonzo(headingEl[0].childNodes[2]);
    var descriptionEl = bonzo(bonzo.create('<div class="descriptionpad"></div>')).appendTo(contentEl);
    descriptionEl.hide();
    bean.add(foldable, 'open', function() {
        if(!solutionOpened && solution.username === user.username) {
            solutionOpened = util.now();
            page.emit('openSolution', null, {
                sessionId : page.getId(),
                taskId : solution.taskId
            });
            openedEl.text('(first opened ' + moment(solutionOpened * 1000).format('YYYY-MM-DD HH:mm') +')');
        }
        descriptionEl.show();
    });
    bean.add(foldable, 'close', function() {
        descriptionEl.hide();
    });
    contentEl.append('<h2>Solution</h2>');
    var codepadEl = bonzo(bonzo.create('<div class="codepad"></div>')).appendTo(contentEl);
    var textareaEl = bonzo(bonzo.create('<div class="textarea"></div>')).appendTo(codepadEl);
    var resizerEl = bonzo(bonzo.create('<div class="resizer"></div>')).appendTo(codepadEl);
    var spacerEl = bonzo(bonzo.create('<div class="codepadspacer"></div>')).appendTo(contentEl);
    var submitEl = bonzo(bonzo.create('<p class="submit"><button class="btn btn-primary">Submit for review</button></p>')).appendTo(contentEl);
    var editorEl = window.textareaToEditor(textareaEl[0]);

    var submissions = new SubmissionsWidget().init(bonzo(bonzo.create('<div>')).appendTo(contentEl), page);

    var handlePatch = function(_, msg) {
        editorEl.getSession().setValue(dmp.patch_apply(msg.patch, editorEl.getSession().getValue())[0]);
    };
    var dim = {
        height : parseInt(window.getCookie('editorHeight'), 10) || 300
    };
    var resize = function(height) {
        spacerEl.css('height', height + 10);
        textareaEl.css('height', height);
        resizerEl.css('top', height);
        editorEl.resize();
    };
    var delay = new Delay();
    var lastSyncedDescription = null;
    var sync = function() {
        var v = editorEl.getSession().getValue();
        if(lastSyncedDescription !== v) {
            page.emit('patchSolution', null, {
                sessionId : page.getId(),
                taskId : solution.taskId,
                patch : dmp.patch_make(dmp.diff_main(lastSyncedDescription, v))
            });
            lastSyncedDescription = v;
        }
    };
    var textareaListener = function() {
        delay.set(sync);
    };
    editor.setSolution = function(newSolution) {
        if(solution.username === newSolution.username && solution.taskId === newSolution.taskId) {
            return;
        }
        if(solution.username === user.username) {
            editorEl.getSession().removeEventListener('change', textareaListener);
        } else {
            removeHandlePatch();
        }
        solution = newSolution;
        foldable.close();
        var tokens = marked.lexer(taskMap[String(solution.taskId)].description);
        v.each(tokens, function(token) {
            if(token.type === 'heading') {
                token.depth += 2;
            }
        });
        descriptionEl.html(marked.parser(tokens));

        page.req('/getSubmissions', {
            taskId : solution.taskId,
            username : solution.username
        }, function(_, s) {
            submissions.clear();
            v.each(s, v.bind(submissions, submissions.add));
        });

        page.req('/getSolution', {
            taskId : solution.taskId,
            username : solution.username
        }, function(_, solution) {
            editorEl.getSession().setValue(solution.description);
            solutionOpened = solution.opened;
            if(solutionOpened) {
                openedEl.text('(first opened ' + moment(solutionOpened * 1000).format('YYYY-MM-DD HH:mm') +')');
            } else {
                openedEl.text('(never opened)');
            }
            if(solution.username === user.username) {
                editorEl.setReadOnly(false);
                submitEl.show();
                lastSyncedDescription = solution.description;
                editorEl.getSession().addEventListener('change', textareaListener);
            } else {
                editorEl.setReadOnly(true);
                submitEl.hide();
            }
        });


        if(solution.username !== user.username) {
            removeHandlePatch = page.on('patch-' + solution.username + '-' + solution.taskId, handlePatch);
        }
    };
    bean.add(submitEl[0], 'click', function(e) {
        var submission = {
            time : new Date().getTime() / 1000,
            taskId : solution.taskId,
            description : editorEl.getSession().getValue()
        };
        submission.reviews = [];
        v.each(submission.description.split('\n'), function(line) {
            submission.reviews.push([]);
        });
        page.req('/submitSolution', {
            sessionId : page.getId(),
            submission : submission
        }, function(err, submissionId) {
            submission.id = submissionId;
            submissions.add(submission);
        });
    });
    bean.add(window.window, 'mousemove', function(e) {
        if(rdown !== null) {
            resize(dim.height + (e.pageY - rdown.y));
        }
    });
    var rdown = null;
    bean.add(window.window, 'mouseup', function(e) {
        dim.height = parseInt(textareaEl.css('height'), 10);
        window.setCookie('editorHeight', String(dim.height));
        rdown = null;
    });
    bean.add(resizerEl[0], 'mousedown', function(e) {
        rdown = {
            y : e.pageY
        };
        dim = {
            height : parseInt(textareaEl.css('height'), 10)
        };
        e.preventDefault();
        e.stopPropagation();
    });
    resize(dim.height);
    return editor;
};
