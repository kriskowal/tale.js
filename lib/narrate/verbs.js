
var UTIL = require("n-util");

var Verb = exports.Verb = function (attributes) {
    var self = Object.create(Thing.prototype);
    UTIL.update(self, attributes);
    return self;
}

Object.defineProperty(Verb.prototype, 'verbs', {
    "get": function () {
        return this.verb + "s";
    }
});

Object.defineProperty(Verb.prototype, 'verbed', {
    "get": function () {
        return this.verb + "ed";
    }
});

Object.defineProperty(Verb.prototype, 'verbing', {
    "get": function () {
        return this.verb + "ing";
    }
});

exports.say = {
    "verb": "say",
    "verbed": "said",
    "conjugateObject": function (event) {
        return "&#147;" + event.quote + "&#148;";
    }
};

exports.shout = {
    "verb": "shout",
    "conjugateObject": function (event) {
        return "&#147;" + event.quote + "&#148;";
    }
};

exports.greet = {
    "verb": "greet",
    "verbing": "is greeting",
    "conjugateObject": function (event) {
        return "everyone, &#147;" + event.quote + "&#148;";
    }
};

exports.arrive = {
    "verb": "arrive",
    "conjugateObject": function (event, narrative) {
        if (!event.modifiers)
            return;
        var from = narrative.identifyLocation(event.modifiers.from);
        if (from)
            return 'from ' + from;
    }
};

exports.leave = {
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
};

