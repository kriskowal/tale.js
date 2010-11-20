
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
    "verbed": "verbed"
};

exports.leave = {
    "verb": "leave",
    "verbs": "leaves",
    "verbing": "leaving",
    "verbed": "verbed"
};

