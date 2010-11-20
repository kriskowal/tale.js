
var HTML = require("../../html");

exports.say = {
    "verb": "say",
    "verbs": "says",
    "verbing": "saying",
    "verbed": "said",
    "predicate": function (event) {
        return "&#147;" + event.quote + "&#148;";
    }
};

exports.arrive = {
    "verb": "arrive",
    "verbs": "arrives",
    "verbing": "arriving",
    "verbed": "arrived",
    "predicate": function (event, narrative) {
        if (!event.modifiers)
            return;
        var from = narrative.identifyLocation(event.modifiers.from);
        if (from)
            return 'from ' + from;
    }
};

exports.leave = {
    "verb": "leave",
    "verbs": "leaves",
    "verbing": "leaving",
    "verbed": "left",
    "predicate": function (event, narrative) {
        if (!event.modifiers)
            return;
        var to = narrative.identifyLocation(event.modifiers.to);
        if (to)
            return 'to ' + to;
    }
};

