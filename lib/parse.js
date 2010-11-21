
exports.readCommand = function (text) {
    var command, match, remainder;
    match = /\s+/.exec(text);
    if (match === null) {
        return {
            "command": text,
            "arg": ""
        };
    } else {
        command = text.substring(0, match.index);
        text = text.substring(match.index);
        match = /\S/.exec(text);
        if (!match) {
            return {
                "command": command,
                "arg": ""
            };
        } else {
            text = text.substring(match.index);
            return {
                "command": command,
                "arg": text
            };
        }
    }
};

if (require.main === module)
    [
        "command",
        "command ",
        "command arg"
    ].forEach(function (command) {
        console.log(exports.readCommand(command));
    });

