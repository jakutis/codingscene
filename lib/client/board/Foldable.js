var bean = require('bean');

var Foldable = function() {
};

Foldable.prototype = {
    _cfg : null,
    _signEl : null,
    _opened : false
};

Foldable.prototype.close = function() {
    var self = this;
    if(self._opened) {
        self._opened = false;
        self._signEl.addClass('icon-plus').removeClass('icon-minus');
        bean.fire(self, 'close');
    }
    return self;
};

Foldable.prototype.open = function() {
    var self = this;
    if(!self._opened) {
        self._opened = true;
        self._signEl.addClass('icon-minus').removeClass('icon-plus');
        bean.fire(self, 'open');
    }
    return self;
};

Foldable.prototype.init = function(el, signEl, cfg) {
    var self = this;
    self._cfg = cfg || {};
    if(typeof self._cfg.initiallyOpened === 'undefined') {
        self._cfg.initiallyOpened = false;
    }
    self._signEl = signEl;

    if(self._cfg.initiallyOpened) {
        self._opened = false;
        self.open();
    } else {
        self._opened = true;
        self.close();
    }
    el.css('cursor', 'pointer');
    bean.add(el[0], 'mouseover', function() {
        self._signEl.addClass('icon-white');
        el.css({
            'background-color': '#333',
            'color': 'white'
        });
    });
    bean.add(el[0], 'mouseout', function() {
        self._signEl.removeClass('icon-white');
        el.css({
            'background-color': 'white',
            'color': '#333'
        });
    });
    bean.add(el[0], 'click', function() {
        if(self._opened) {
            self.close();
        } else {
            self.open();
        }
    });
    return self;
};
module.exports = Foldable;
