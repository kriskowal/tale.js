
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
        return Q.when(HTTP.read(location), function (content) {
            location = _location;
            room = JSON.parse(content);
            channel.send(room.description);
            if (room.exits) {
                channel.send(
                    "There are exits: " +
                    UTIL.keys(room.exits).join(", ")
                );
            }
        }, function (reason) {
            channel.send("This location does not appear to exist.");
        });
    }

    go("http://localhost:8080/origin.json");
    var loop = Q.loop(channel.receive, function (message) {
        if (UTIL.has(room.exits, message)) {
            go(URL.resolve(location, room.exits[message].href));
            channel.send("You go " + message);
        } else {
            channel.send("Huh?");
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

