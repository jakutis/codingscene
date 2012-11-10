var v = require('valentine');
var bean = require('bean');
var bonzo = require('bonzo');
var qwery = require('qwery');
var common = require('./common');
var util = require('../util');
var w = require('./window');
var Delay = require('../Delay');

var extract = function(model) {
    var data = {};
    v.each(model, function(name, property) {
        data[name] = property.extract();
    });
    return data;
};
exports.extract = extract;
var validateProperty = function(validator, triggered, model, data, name, property) {
    if(data[name] !== '' || property.touched) {
        property.touched = true;
        if(data[name] !== property.previous) {
            v.each(property.triggered, function(tpropertyName) {
                model[tpropertyName].previous = null;
            });
            property.previous = data[name];
            property.ok();
            validator.validateProperty(data, name, function(_, errors) {
                console.log('validating', name, data[name]);
                if(errors.length > 0) {
                    property.error(errors);
                }
                bean.fire(validator, 'validation', name, errors);
            });
        }
        return true;
    }
    return false;
};
exports.validateProperty = validateProperty;
exports.listen = function(model, validator) {
    var data = extract(model);
    var listening = false;
    var add = [], remove = [];
    var start = function() {
        if(!listening) {
            util.apply(add);
            listening = true;
        }
    };
    var stop = function() {
        if(listening) {
            util.apply(remove);
            listening = false;
        }
    };
    v.each(model, function(name, property) {
        v.each(property.listen, function(listener) {
            bean.add(listener.element, 'focus', start);
            var delay = new Delay();
            var validate = function() {
                if(!listening) {
                    return;
                }
                data[name] = property.extract();
                var cont = validateProperty(validator, false, model, data, name, property);
                if(cont) {
                    v.each(property.triggered, function(tpropertyName) {
                        validateProperty(validator, true, model, data, tpropertyName, model[tpropertyName]);
                    });
                }
            };
            var evlistener = function() {
                delay.set(validate);
            };
            remove.push(function() {
                bean.remove(listener.element, evlistener);
            });
            add.push(function() {
                bean.add(listener.element, listener.events, evlistener);
            });
        });
    });
    return {
        start : start,
        stop : stop
    };
};
exports.makeProperty = function(id, triggered) {
    var el = w.el(id)[0];
    var msg = qwery('span', el.parentNode);
    msg = msg[msg.length - 1];
    return {
        previous : null,
        touched : false,
        triggered : triggered || [],
        listen : [{
            element : el,
            events : common.changeEvents
        }],
        extract : function() {
            return this._input.val();
        },
        _container : bonzo(el.parentNode.parentNode),
        _input : bonzo(el),
        _message : bonzo(msg),
        hasError : function() {
            return this._container.hasClass('error');
        },
        normal : function() {
            this._message.text('');
            this._container.removeClass('error').removeClass('success');
        },
        ok : function() {
            this._message.text('');
            this._container.removeClass('error').addClass('success');
        },
        error : function(errors) {
            this._message.text(v.map(errors, function(error) {
                return error.message;
            }).join('. ') + (errors.length > 0 ? '.' : ''));
            this._container.removeClass('success').addClass('error');
        }
    };
};
