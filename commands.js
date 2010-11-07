
var Q = require("q-util");
var UTIL = require("n-util");
var HTML = require(""); // XXX
var readCommand = require("./parse").readCommand;

exports.Branch = function (commands, nextHandler) {
    nextHandler = nextHandler || exports.noSuchCommand;
    return function (context, command) {
        var parsed = readCommand(command);
        if (UTIL.has(commands, parsed.command)) {
            return commands[parsed.command](context, parsed.arg);
        } else {
            return nextHandler(context, command);
        }
    };
};

exports.noSuchCommand = function () {
    return Q.reject("No such command");
};

function main() {
    var handle = exports.Branch({
        "go": function (context, command) {
            console.log('go', command);
        },
        "teleport": function (context, command) {
            context.send("You go to " + HTML.escape(command));
            context.go(command);
        }
    })
    handle({}, "go south");
    handle({}, "jump");
}

if (require.main === module)
    main()

