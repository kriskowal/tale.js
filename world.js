
var Q = require("q-util");
var HTTP = require("q-http");
var FS = require("q-fs");
var UTIL = require("n-util");
//var Cache = require("chiron/cache").Cache;
var CHIRON = require("chiron");
var URL = require("url");
var HTML = require("./html");
var COMMANDS = require("./commands");

var helpFragHtml = FS.read("help.frag.html");

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

world.connect = function (channel, startUrl) {
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
        _location = URL.resolve(location, _location);
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

    function look(context) {
        context.log("<p>You take another look&hellip;</p>");
        go(location);
    }

    function teleport(context) {
        go(context.command || '');
    }

    function help(context) {
        return Q.when(helpFragHtml, function (help) {
            context.log(help);
        }, Q.error);
    }

    var context = {
        "log": channel.send,
        "go": go
    };

    var commonHandler = COMMANDS.Branch({
        "l": look,
        "look": look,
        "t": teleport,
        "tele": teleport,
        "teleport": teleport,
        "h": help,
        "help": help
    }, function (context) {
        context.log(
            "<p>Huh? I don't understand " +
            JSON.stringify(HTML.escape(context.path + context.command)) +
            ".</p>"
        );
    });

    var commandHandler = COMMANDS.PrefixBranch("'", function (context) {
        return chatHandler(context);
    }, function (context) {
        if (context.command) {
            var exitName = context.command.toLowerCase();
            if (UTIL.has(room.allExits, exitName)) {
                go(room.allExits[exitName].href);
                channel.send("<p>You go " + HTML.escape(exitName) + ".</p>");
            } else {
                return commonHandler(context);
            }
        } else {
            context.log("<p><b>[command mode]</b></p>");
            modeHandler = commandHandler;
        }
    });

    var chatHandler = COMMANDS.PrefixBranch("/", function (context) {
        return commandHandler(context);
    }, function (context) {
        if (context.command) {
            context.log(
                "<p>You say, &#147;" +
                HTML.escape(context.command.replace(/"/g, "'")) +
                "&#148;.</p>"
            );
        } else {
            context.log("<p><b>[chat mode]</b></p>");
            modeHandler = chatHandler;
        }
    });

    var modeHandler = commandHandler;

    var loop = Q.loop(channel.receive, function (command) {
        command = COMMANDS.Command(command, Object.create(context));
        return Q.when(modeHandler(command), function () {
            //console.log('Command handled: ' + JSON.stringify(context));
        }, function (reason) {
            context.log('!!! ' + reason);
        });
    });

    go(startUrl);

};

world.start = function () {
    var world = this;
    var running = true;
    var stopping = Q.defer();
    function run() {
        /*
        if (running) {
            world.tick();
            setTimeout(run, 1000);
        }
        */
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

