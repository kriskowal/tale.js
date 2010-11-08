
var Q = require("q-util");
var HTTP = require("q-http");
var UTIL = require("n-util");
//var Cache = require("chiron/cache").Cache;
var CHIRON = require("chiron");
var URL = require("url");

var world = exports.world = {};

var genesis = {
    "description": "You find yourself in a protogenic place, a room that has not been created, or cannot be found.",
    "exits": {
        "back": {
            "href": "#"
        }
    }
};

world.connect = function (channel) {
    var queue = Q.Queue();

    var room;
    var location;

    function describe() {
        var description = room.description;
        if (room.name)
            description =
                "<h2>" + room.name + "</h2>" +
                "<p>" + description + "</p>";
        channel.send(description);
        if (room.exits) {
            channel.send(
                "<p>There are exits: " +
                UTIL.keys(room.exits).join(", ") +
                ".</p>"
            );
        }
    }

    function go(_location) {
        return Q.when(HTTP.read(_location), function (content) {
            _room = JSON.parse(content);
            location = _location;
            room = _room;
            describe();
        }, function (reason) {
            console.error(reason);
            room = genesis;
            describe();
        });
    }

    go("http://localhost/world/dya.json");
    var loop = Q.loop(channel.receive, function (message) {
        if (UTIL.has(room.exits, message)) {
            go(URL.resolve(location, room.exits[message].href));
            channel.send("<p>You go " + message + ".</p>");
        } else if (message === "l" || message === "look") {
            channel.send("<p>You take another look&hellip;</p>");
            go(location);
        } else {
            channel.send("<p>Huh?</p>");
        }
    });

};

world.tick = function () {
};

world.start = function () {
    var world = this;
    var running = true;
    var stopping = Q.defer();
    function run() {
        if (running) {
            world.tick();
            setTimeout(run, 1000);
        }
    }
    Q.enqueue(run);
    return {
        "stop": function () {
            running = false;
            stopping.resolve();
        },
        "stopped": stopping.promise
    }
};

var Room = function () {
};

var Mob = function () {
};

Mob.prototype.tick = function () {
};

