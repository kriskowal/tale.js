
var Q = require("q-util");
var HTTP = require("q-http");
var UTIL = require("n-util");
//var Cache = require("chiron/cache").Cache;
var CHIRON = require("chiron");
var URL = require("url");

var world = exports.world = {};

world.connect = function (channel) {
    var queue = Q.Queue();

    var room;
    var location;

    function go(_location) {
        return Q.when(HTTP.read(_location), function (content) {
            _room = JSON.parse(content);
            var description = _room.description;
            if (_room.name)
                description =
                    "<h2>" + _room.name + "</h2>" +
                    "<p>" + description + "</p>";
            channel.send(description);
            if (_room.exits) {
                channel.send(
                    "<p>There are exits: " +
                    UTIL.keys(_room.exits).join(", ") +
                    ".</p>"
                );
            }
            location = _location;
            room = _room;
        }, function (reason) {
            channel.send("<p>This location does not appear to exist.</p>");
        });
    }

    go("http://localhost:8080/world/dya.json");

    var loop = Q.loop(channel.receive, function (message) {
        if (UTIL.has(room.exits, message)) {
            go(URL.resolve(location, room.exits[message].href));
            channel.send("<p>You go " + message + ".</p>");
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

