
var Q = require("q-util");
var UTIL = require("n-util");
var HTML = require("./html");
var RE = require("./re");
var readCommand = require("./parse").readCommand;

exports.Command = function (command, context) {
    context = context || {};
    context.path = "";
    context.command = command;
    return context;
};

exports.Named = function (name, handler) {
    handler.menuName = name;
    return handler;
};

exports.Branch = function (commands, nextHandler) {
    nextHandler = nextHandler || exports.noSuchCommand;
    var handler = function (context) {
        var parsed = readCommand(context.command);
        if (UTIL.has(commands, parsed.command)) {
            context.path = (context.path || '') + parsed.command + " ";
            context.command = parsed.arg;
            return commands[parsed.command](context);
        } else {
            return nextHandler(context);
        }
    };
    handler.menu = function () {
        var menu = UTIL.object(UTIL.mapApply(commands, function (command, handler) {
            return [handler.menuName || key, key + " "];
        }));
        if (nextHandler.menu)
            Array.prototype.push.apply(menu, nextHandler.menu());
        return menu;
    };
    return handler;
};

exports.PrefixBranch = function (prefix, thisHandler, nextHandler) {
    prefix = new RegExp('^(' + RE.escape(prefix) + ')(.*)');
    var handler = function (context) {
        var match = prefix.exec(context.command);
        if (match) {
            context.path = context.path + match[1];
            context.prefix = match[1];
            context.command = match[2];
            return thisHandler(context);
        } else {
            return nextHandler(context);
        }
    };
    handler.menu = function () {
        var menu = UTIL.object([
            [prefix, prefix]
        ]);
        if (nextHandler.menu)
            Array.prototype.push.apply(menu, nextHandler.menu());
        return menu;
    };
    return handler;
};

exports.noSuchCommand = function (context) {
    return console.log("No such command: " + HTML.escape(context.path + context.command));
};

function main() {
    var handle = exports.Branch({
        "go": function (context) {
            console.log('go', context.command);
        },
        "teleport": function (context) {
            context.send("You go to " + HTML.escape(context.command));
            context.go(context.command);
        }
    })
    handle(exports.Command("go south"));
    handle(exports.Command("jump"));
}

if (require.main === module)
    main()

