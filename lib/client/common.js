var coll = require('es6-collections');
var morpheus = require('morpheus');

exports.changeEvents = 'keyup change click select input';
var blinks = new coll.Map();
exports.blink = function(el) {
    if(!blinks.has(el)) {
        blinks.set(el, null);
    }

    if(blinks.get(el)) {
        el.css('opacity', 0);
        blinks.get(el).stop();
    }

    el.show();
    blinks.set(el, morpheus(el, {
        opacity : 1,
        duration : 200,
        complete : function() {
            blinks.set(el, morpheus(el, {
                duration : 2000,
                opacity : 0,
                complete : function() {
                    el.hide();
                    blinks.set(el, null);
                }
            }));
        }
    }));
};
