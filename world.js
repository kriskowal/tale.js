
var Q = require("q-util");
var HTTP = require("q-http");
var UTIL = require("n-util");
//var Cache = require("chiron/cache").Cache;
var CHIRON = require("chiron");
var URL = require("url");
var HTML = require("./html");

var world = exports.world = {};

function Room(room) {
    var exits = room.allExits = {};
    UTIL.forEachApply(room.exits || {}, function (direction, exit) {
        exits[direction] = exit;
        (exit.aliases || []).forEach(function (direction) {
            exits[direction] = exit;
        });
    });
    return room;
}

var genesis = Room({
    "description": "You pass through a rift in the fabric of the world into " +
    "a void, a place that should exist but does not.",
    "exits": {
        "back": {
            "href": ""
        }
    }
});

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
            try {
                _room = JSON.parse(content);
                location = _location;
                room = Room(_room);
                describe();
            } catch (exception) {
                room = genesis;
                describe();
                throw exception;
            }
        }, function (reason) {
            console.error(reason);
            room = genesis;
            describe();
        });
    }

    go("http://localhost:8080/world/dya.json");
    var loop = Q.loop(channel.receive, function (message) {
        if (UTIL.has(room.allExits, message)) {
            go(URL.resolve(location, room.allExits[message].href));
            channel.send("<p>You go " + message + ".</p>");
        } else if (message === "l" || message === "look") {
            channel.send("<p>You take another look&hellip;</p>");
            go(location);
        } else {
            channel.send("<p>Huh? I don't understand " + JSON.stringify(HTML.escape(message)) + ".</p>");
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

var Mob = function () {
};

Mob.prototype.tick = function () {
};

