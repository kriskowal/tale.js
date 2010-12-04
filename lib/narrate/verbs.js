
var UTIL = require("n-util");

var Verb = exports.Verb = function (attributes) {
    var self = Object.create(Verb.prototype);
    UTIL.update(self, attributes);
    return self;
}

Object.defineProperty(Verb.prototype, 'verbs', {
    "get": function () {
        return this._verbs || this.verb + "s";
    },
    "set": function (value) {
        this._verbs = value;
    }
});

Object.defineProperty(Verb.prototype, 'verbed', {
    "get": function () {
        return this._verbed || this.verb + "ed";
    },
    "set": function (value) {
        this._verbed = value;
    }
});

Object.defineProperty(Verb.prototype, 'verbing', {
    "get": function () {
        return this._verbing || this.verb + "ing";
    },
    "set": function (value) {
        this._verbing = value;
    }
});

exports.say = Verb({
    "verb": "say",
    "verbed": "said",
    "conjugateObject": function (event) {
        return "&#147;" + event.quote + "&#148;";
    }
});

exports.shout = Verb({
    "verb": "shout",
    "conjugateObject": function (event) {
        return "&#147;" + event.quote + "&#148;";
    }
});

exports.greet = Verb({
    "verb": "greet",
    "verbing": "is greeting",
    "conjugateObject": function (event) {
        return "everyone, &#147;" + event.quote + "&#148;";
    }
});

exports.arrive = Verb({
    "verb": "arrive",
    "conjugateObject": function (event, narrative) {
        if (!event.modifiers)
            return;
        var from = narrative.identifyLocation(event.modifiers.from);
        if (from)
            return 'from ' + from;
    }
});

exports.leave = Verb({
    "verb": "leave",
    "verbing": "leaving",
    "verbed": "left",
    "conjugateObject": function (event, narrative) {
        if (!event.modifiers)
            return;
        var to = narrative.identifyLocation(event.modifiers.to);
        if (to)
            return 'to ' + to;
    }
});

