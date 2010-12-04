
var Q = require("q-util");
var HTTP = require("q-http");
var FS = require("q-fs");
var UTIL = require("n-util");
//var Cache = require("chiron/cache").Cache;
var CHIRON = require("chiron");
var URL = require("url");
var HTML = require("./html");
var COMMANDS = require("./commands");
var WORLD = require("./world");
var DISPATCH = require("./dispatch");
var UUID = require("uuid");
var verbs = require("./narrate/verbs");
var Thing = require("./narrate/things").Thing;
var Narrative = require("./narrate").Narrative;
var readCommand = require("./parse").readCommand;

var helpFragHtml = FS.read("resources/help.frag.html");

var engine = exports.engine = {};

var dispatcher = DISPATCH.Dispatcher();
exports.dispatcher = dispatcher;

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

engine.connect = function (channel, startUrl) {
    var queue = Q.Queue();

    channel.send(JSON.stringify({
        "to": "time",
        "content": new Date().getTime()
    }));

    var player = Thing({
        "id": UUID.generate(),
        "name": undefined,
        "gender": undefined,
        "singular": "person",
        "person": true,
        "creature": true,
        "inventory": []
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
        "close": function () {},
        "connections": function () {return []}
    };

    var playerStream = dispatcher.open(player.id, player.id);
    playerStream.connect(receive);

    var globalStream = dispatcher.open('global', player.id);
    globalStream.connect(receive);

    function receive(message) {
        context.log(JSON.stringify({
            "to": "log",
            "content": '<p>' + narrative.say(message) + '</p>'
        }));
    }

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
                    return '<a class="command" command=\"' + e + '\" href="#" target="_blank">' + e + '</a>'
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

        // music
        if (room.music) {
            channel.send(JSON.stringify({
                "to": "music",
                "content": room.music
            }));
        }

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

    function go(_location, boldly) {
        _location = URL.resolve(location, _location);
        if (_location === location) {
            !boldly && describe();
        } else {
            return Q.when(WORLD.load(_location), function (_room) {
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
                !boldly && describe();
            }, function (reason) {
                console.error(reason);
                room = genesis;
                !boldly && describe();
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
                command = conjugates.shift();
                var match = /^(.*)e?s$/.exec(command);
                if (match) {
                    verbs = command;
                    verb = match[1];
                } else {
                    verb = command;
                    verbs = verb + "s";
                }
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
                "verb": verbs.greet,
                "object": "everyone",
                "quote": "Hello.",
            });
        } else {
            roomStream.send({
                "subject": player,
                "verb": verbs.greet,
                "object": "everyone",
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
                !message.quiet && receive(message);
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
            "chat": function (context) {
                // late bound, since declared later
                return chatHandler(context);
            },
            "i": emote,
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
            channel.send(JSON.stringify({
                "to": "mode",
                "content": "command"
            }));
            modeHandler = commandHandler;
        }
    });

    var chatHandler = COMMANDS.PrefixBranch("/", function (context) {
        return commandHandler(context);
    }, function (context) {
        if (context.command) {
            var shout = !!/!!!$/.exec(context.command);
            var stream = shout ? globalStream : roomStream;
            var verb = shout ? verbs.shout : verbs.say;
            stream.send({
                "subject": player,
                "verb": verb,
                "quote": HTML.escape(context.command)
            });
        } else {
            context.log("<p><b>[chat mode]</b></p>");
            channel.send(JSON.stringify({
                "to": "mode",
                "content": "chat"
            }));
            modeHandler = chatHandler;
        }
    });

    var modeHandler = chatHandler;

    var loop = Q.loop(channel.receive, function (message) {
        try {
            message = JSON.parse(message);
        } catch (exception) {
            console.log('Malformed message: ' + message);
            return;
        }
        if (message.to === 'command') {
            var command = message.content;
            command = COMMANDS.Command(command, Object.create(context));
            var handler = {
                "command": commandHandler,
                "chat": chatHandler
            }[message.mode] || modeHandler;
            return Q.when(handler(command), function () {
                //console.log('Command handled: ' + JSON.stringify(context));
            }, function (reason) {
                context.log("<p>Tale encountered a technical difficulty processing your command.</p>");
                console.log('!!! ' + reason);
            });
        } else if (message.to === 'control') {
            //context.log('<p>^' + "abcdefghijklmnopqrstuvwxyz"[message.content - 1] + "</p>");
        } else {
            console.log('unable to deliver message:');
            console.log(message);
        }
    });

    go(startUrl);

    Q.when(channel.disconnected, function () {
        roomStream.send({
            "subject": player,
            "verb": verbs.leave,
            "modifiers": {
                "from": location
            }
        });
        roomStream.close();
        playerStream.close();
        globalStream.close();
    });

};

engine.start = function () {
    var engine = this;
    var running = true;
    var stopping = Q.defer();
    function run() {
        /*
        if (running) {
            engine.tick();
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

