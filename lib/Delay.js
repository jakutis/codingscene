var Delay = function() {
};
Delay.prototype = {
    _id : null,
    duration : 150,
    set : function(fn) {
        clearTimeout(this._id);
        this._id = setTimeout(fn, this.duration);
    }
};
module.exports = Delay;
