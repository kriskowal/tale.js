
var Q = require("q-util");
var HTTP = require("q-http");
var FS = require("q-fs");
var UTIL = require("n-util");
//var Cache = require("chiron/cache").Cache;
var CHIRON = require("chiron");
var URL = require("url");
var HTML = require("./html");
var COMMANDS = require("./commands");
var MESSAGES = require("./messages");
var UUID = require("uuid");
var verbs = require("./lib/narrate/verbs");
var Thing = require("./lib/narrate/things").Thing;
var Narrative = require("./lib/narrate").Narrative;
var readCommand = require("./parse").readCommand;

var helpFragHtml = FS.read("help.frag.html");

var world = exports.world = {};

var dispatcher = MESSAGES.Dispatcher();

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

    var player = Thing({
        "id": UUID.generate(),
        "name": undefined,
        "gender": undefined,
        "singular": "person",
        "person": true,
        "creature": true
    });

    var narrator = Thing({
        "id": UUID.generate(),
        "singular": "person",
        "person": true,
        "creature": true
    });

    var narrative = Narrative(narrator, player);

    var room;
    var location;
    var roomStream = {
        "send": function () {},
        "close": function () {}
    };

    function describe() {

        var description = '<p>' + room.description + '</p>';
        if (room.image)
            description = '<img src="' + room.image + '" align="right" height="200" width="200">' + description;
        if (room.name)
            description = "<h2>" + room.name + "</h2>" + description;
        context.log(description);

        var parts = [];
        if (room.exits) {
            parts.push(
                "There are exits: " +
                UTIL.keys(room.exits).map(function (e) {
                    return '<a onclick="sendCommand(\'' + e + '\'); return false" href="#" target="_blank">' + e + '</a>'
                }).join(", ") +
                "."
            );
        }
        var connections = roomStream.connections();
        if (connections.filter(function (id) {
            return id !== player.id;
        }).length) {
            parts.push("There are people here: " + narrative.identifyPeople(connections) + ".");
        }
        context.log("<p>" + parts.join(" ") + "</p>");

        // NARRATIVE
        narrative.flush();
        // learn the name of this location
        narrative.learnLocation(location, room.name);
        // learn the names of places in various directions
        var directions = UTIL.mapApply(room.exits, function (direction, exit) {
            return [URL.resolve(location, exit.href), direction];
        })
        directions = UTIL.object(directions);
        narrative.learnDirections(directions);

    }

    function go(_location) {
        _location = URL.resolve(location, _location);
        if (_location === location) {
            describe();
        } else {
            return Q.when(HTTP.read(_location), function (content) {
                try {
                    _room = JSON.parse(content);
                    room = Room(_room);
                    roomStream.close();
                    roomStream.send({
                        "subject": player,
                        "verb": verbs.leave,
                        "modifiers": {
                            "from": location,
                            "to": _location
                        }
                    });
                    roomStream = dispatcher.open(_location, player.id);
                    roomStream.send({
                        "subject": player,
                        "verb": verbs.arrive,
                        "modifiers": {
                            "from": location,
                            "to": _location
                        }
                    });
                    roomStream.connect(context.log);
                    location = _location;
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
    }

    function goCommand(context) {
        if (!UTIL.has(room.allExits, context.command)) {
            context.log(
                "<p>There is no way to go &#147;" +
                HTML.escape(context.command) +
                "&#148; from here.</p>"
            );
        } else {
            go(room.allExits[context.command].href);
        }
    }

    function look(context) {
        context.log("<p>You take another look&hellip;</p>");
        go(location);
    }

    function emote(context) {
        var verb, verbs;
        var command = context.command;
        var conjugates = command.split(" / ");
        if (conjugates.length === 1) {
            var commandParsed = readCommand(command);
            command = commandParsed.command;
            var arg = commandParsed.arg;
            var conjugates = command.split("/");
            if (conjugates.length === 1) {
                verb = verbs = conjugates.shift();
            } else {
                verb = conjugates[0];
                verbs = conjugates.slice(1).join("/");
            }
            if (arg) {
                verb = verb + " " + arg;
                verbs = verbs + " " + arg;
            }

        } else {
            verb = conjugates[0];
            verbs = conjugates.slice(1).join(" / ");
        }
        roomStream.send({
            "subject": player,
            "verb": {
                "verb": "&#147;" + verb + "&#148;",
                "verbs": "&#147;" + verbs + "&#148;"
            },
            "quote": context.command,
        });
    }

    function teleport(context) {
        go(context.command || '');
    }

    function who(context) {
        context.log("<p>People here: " + narrative.identifyPeople(roomStream.connections()) + ".</p>");
    }

    function nick(context) {
        var name = context.command || '';
        if (name.length < 1 || name.length > 10 || HTML.escape(name) !== name) {
            context.log("<p>You cannot go by the name, &#147;" + HTML.escape(name) + "&#148;.</p>");
            return;
        }
        name = name[0].toUpperCase() + name.slice(1);
        player.name = name;
        context.log("<p>You call yourself, &#147;" + HTML.escape(player.name) + "&#148;. That is the name you will use when greeting people.</p>");
    }

    function gender(context) {
        if (!UTIL.has(['male', 'female'], context.command)) {
            context.log("<p>For the purpose of the narrative, &#147;male&#148; and &#147;female&#148; are the gender options, not &#147;" + HTML.escape(context.command) + "&#148;.</p>");
        } else {
            context.log("<p>Okay, people will recognize your gender now.</p>");
            player.gender = context.command;
        }
    }

    function greet(context) {
        if (player.name === undefined) {
            roomStream.send({
                "subject": player,
                "verb": verbs.say,
                "quote": "Hello.",
            });
        } else {
            roomStream.send({
                "subject": player,
                "verb": verbs.say,
                "quote": "Hi, I&#8217;m " + player.name + ".",
                "player": player,
                "post": function (context) {
                    context.narrative.meet(this.player, this.player.name, this.player.gender);
                }
            });
        }
    }

    function call(context) {
        context.command
    }

    function help(context) {
        return Q.when(helpFragHtml, function (help) {
            context.log(help);
        }, Q.error);
    }

    var context = {
        "log": function (message) {
            if (typeof message === "string") {
                channel.send(JSON.stringify({
                    "to": "log",
                    "content": message
                }));
            } else {
                message.pre &&
                    message.pre(context);
                !message.quiet &&
                    channel.send(JSON.stringify({
                        "to": "log",
                        "content": '<p>' + narrative.say(message) + '</p>'
                    }));
                message.post &&
                    message.post(context);
            }
        },
        "go": go,
        "player": player,
        "narrative": narrative,
        "effect": function (message) {
            roomStream.send(message);
        },
        "commands": {
            "g": goCommand,
            "go": goCommand,
            "l": look,
            "look": look,
            "t": teleport,
            "tele": teleport,
            "teleport": teleport,
            "say": function (context) {
                // late bound, since declared later
                return chatHandler(context);
            },
            "me": emote,
            "w": who,
            "who": who,
            "nick": nick,
            "name": nick,
            "gender": gender,
            "greet": greet,
            "h": help,
            "help": help
        }
    };

    var commonHandler = COMMANDS.Branch(context.commands, function (context) {
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
                context.log("<p>You go " + HTML.escape(exitName) + ".</p>");
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
            roomStream.send({
                "subject": player,
                "verb": verbs.say,
                "quote": HTML.escape(context.command)
            });
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

    Q.when(channel.disconnected, function () {
        roomStream.close();
    });

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

