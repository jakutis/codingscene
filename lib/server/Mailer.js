var marked = require('marked');

var Mailer = function() {
};
Mailer.prototype = {
    _cfg : null,
    _logger : null,
    _smtp : null,
    init : function(mailer, cfg, logger) {
        this._smtp = mailer;
        this._cfg = cfg;
        this._logger = logger;
        return this;
    },
    sign : function(mail) {
        var self = this;
        return mail + '\n--\n' + self._cfg.signature;
    },
    signHTML : function(mail) {
        var self = this;
        return mail + '<p>--</p>' + self._cfg.signatureHTML;
    },
    sendMarkdown : function(to, subject, text) {
        var self = this;
        var mail = {
            from : self._cfg.client.namedEmail,
            to : to,
            subject : subject,
            text : self.sign(text),
            html : self.signHTML(marked(text))
        };
        self._logger.info('sendMarkdown', mail);
        self._smtp.sendMail(mail, function(error, response) {
            if(error) {
                throw error;
            }
            self._logger.info('mail sent', mail, response.message);
        });
    },
    sendReminder : function(username, email, hash) {
        var self = this;
        var mail = {
            from : self._cfg.client.namedEmail,
            to : email,
            subject : 'Reset your password, ' + username + '!',
            text : self.sign('Hi, someone (possibly you) requested to reset your Coding Summit account password. Do it by opening this link: ' + self._cfg.client.baseurl + '/account/passwordReset/' + hash),
            html : self.signHTML('Hi, someone (possibly you) requested to <a href="' + self._cfg.client.baseurl + '/account/passwordReset/' + hash + '">reset your Coding Summit account password</a>.')
        };
        self._logger.info('sendReminder', mail);
        self._smtp.sendMail(mail, function(error, response) {
            if(error) {
                throw error;
            }
            self._logger.info('mail sent', mail, response.message);
        });
    },
    sendConfirmation : function(user, emailConfirmed) {
        var self = this;
        var mail = {
            from : self._cfg.client.namedEmail,
            to : user.email,
            subject : 'Confirm your Coding Summit account, ' + user.username + '!',
            text : self.sign('Please confirm your Coding Summit account by opening this link: ' + self._cfg.client.baseurl + '/account/confirm/' + emailConfirmed),
            html : self.signHTML('Please <a href="' + self._cfg.client.baseurl + '/account/confirm/' + emailConfirmed + '">confirm your Coding Summit account</a>.')
        };
        self._logger.info('sendConfirmation', mail);
        self._smtp.sendMail(mail, function(error, response) {
            if(error) {
                throw error;
            }
            self._logger.info('mail sent', mail, response.message);
        });
    },
    sendNotification : function(user, emailConfirmed) {
        var self = this;
        var mail = {
            from : self._cfg.client.namedEmail,
            to : self._cfg.client.namedEmail,
            subject : 'New Coding Summit account added: ' + user.username,
            text : '',
            html : ''
        };
        self._logger.info('sendNotification', mail);
        self._smtp.sendMail(mail, function(error, response) {
            if(error) {
                throw error;
            }
            self._logger.info('mail sent', mail, response.message);
        });
    }
};
module.exports = Mailer;
