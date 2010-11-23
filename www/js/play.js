(function (global) {

var Q = global["/q"];
var COLORS = global["/tale/color-scheme"];

this.WEB_SOCKET_SWF_LOCATION = "/js/websocket.swf";

var form, prompt, commandLine;

function initialSetup() {
    var ready = Q.defer();
    $.get("command.frag.html", function (frag) {
        $(frag).insertAfter($("#buffer"));
        $(document).scrollTop($(document).scrollTop() + 1000);
        prompt = $("#prompt");
        commandLine = $("#command-line");
        commandLine.focus();
        commandLine.keypress(function (event) {
            if (event.metaKey) {
                socket.send(JSON.stringify({
                    "to": "control",
                    "content": event.which
                }));
                return false;
            }
        });
        form = $("#command-form");
        form.submit(function () {
            var command = commandLine.val();
            send(command);
            commandLine.val("").focus();
            return false;
        });
        ready.resolve();
    });
    return Q.when(ready.promise, setup);
}

var socketSend = function (command, mode) {
    socket.send(JSON.stringify({
        "to": "command",
        "content": command,
        "mode": mode
    }));
};

// a hook for links that send commands
window.sendCommand = function (command) {
    socketSend(command, "command");
};

var send = socketSend;

var socket, retryInterval = 3;
function setup() {
    socket = new io.Socket();
    socket.connect();
    var connected = Q.defer();
    var reconnectCountdown = Q.defer();
    var reconnect = Q.defer();

    setTimeout(connected.reject, 3000);
    socket.on('connect', connected.resolve);
    socket.on('message', function (message) {
        console.log(message);
        message = JSON.parse(message);
        var recipient = ({
            "log": log,
            "css": css,
            "colors": colors,
            "time": time
        })[message.to];
        if (recipient) {
            recipient(message.content);
        } else {
            console.log(message);
        }
    });
    socket.on('disconnect', function () {
        setStatus("<p>Tale has disconnected.</p>");
        reconnectCountdown.resolve();
    });

    Q.when(connected.promise, function () {
        retryInterval = 3;
        send = socketSend;
    }, function (reason) {
        reconnectCountdown.resolve();
    });

    Q.when(reconnectCountdown.promise, function () {
        var count = countdown(retryInterval, function (seconds) {
            setStatus(
                $("<p>Trying to connect again in " + seconds + " seconds&hellip; </p>")
                .append(
                    $('<a href="#">try now</a>').click(function (event) {
                        event.stopPropagation();
                        event.preventDefault();
                        reconnect.resolve();
                    })
                )
            );
        }, reconnect.resolve);
        Q.when(reconnect.promise, count.cancel);
        retryInterval = Math.min(60, retryInterval * 2);
        send = function (command) {
            reconnect.resolve();
            command && Q.when(reconnected, function () {
                send(command);
            });
        };
    });

    var reconnected = Q.when(reconnect.promise, function () {
        setStatus("<p>Trying again&hellip;</p>");
        return Q.when(setup(), function () {
            resetStatus('<p>Tale has reconnected.</p>');
        });
    });

    return connected.promise;
}

function countdown(seconds, every, last) {
    var cancelled = false;
    function tick(seconds) {
        if (cancelled)
            return;
        if (seconds <= 0) {
            last();
        } else {
            every(seconds);
            setTimeout(function () {
                tick(seconds - 1);
            }, 1000);
        }
    }
    tick(seconds);
    return {
        "cancel": function () {
            cancelled = true;
        }
    };
};

var cssElement;
function css(css) {
    if (!cssElement)
        cssElement = $("<style></style>").appendTo(document.body);
    cssElement.text(css);
}

function colors(colors) {
    css(
        "body { " +
            "background-color: " + colors.back + "; " +
            "color: " + colors.fore + "; " +
        "} " +
        "a { " +
            "color: " + colors.fore + "; " +
        "} "
   )
}

function transition(at, steps, interval, callback, done) {
    if (at < 1) {
        setTimeout(function () {
            transition(at + 1 / steps, steps, interval, callback, done);
        }, interval);
    } else {
        done();
    }
    // call after setting an interval to
    // ensure that it is scheduled before computational
    // delay
    callback(at);
}

var currentColors = {
    "back": "#46b3d3",
    "fore": "#000000"
};
var animationComplete;
function animateColors(newColors) {
    animationComplete =
    Q.when(animationComplete, function () {
        var complete = Q.defer();
        transition(0, 20, 200, function (progress) {
            colors({
                "back": COLORS.over(currentColors.back, newColors.back, progress),
                "fore": COLORS.over(currentColors.fore, newColors.fore, progress)
            });
        }, function () {
            currentColors = newColors;
            complete.resolve();
        });
        return complete.promise;
    });
}

var secondsPerDay = 60 * 60;
var secondsPerYear = secondsPerDay * 4;
var updateColorsHandle;
var timeOffset = 0;
function updateColors() {
    if (updateColorsHandle)
        clearTimeout(updateColorsHandle);
    var n = timeOffset + new Date().getTime();
    animateColors(COLORS.colors(
        n / 1000 % secondsPerDay / secondsPerDay,
        n / 1000 % secondsPerYear / secondsPerYear
    ));
    updateColorsHandle = setTimeout(updateColors, 20000);
}

function time(serverDate) {
    timeOffset = serverDate - new Date().getTime();
    updateColors();
}

// command line buffer
var buffer = $("#buffer");
function log(message) {
    message = $(message);
    before();
    buffer.append(message);
    after();
    return message;
}

// buffered status message
var statusMessage;
function setStatus(message) {
    if (statusMessage) {
        var newMessage = $(message);
        before();
        statusMessage.replaceWith(newMessage);
        after();
        statusMessage = newMessage;
    } else {
        statusMessage = $(message);
        log(statusMessage);
    }
}
function resetStatus(message) {
    setStatus(message);
    statusMessage = undefined;
}

// buffer position control
var wasBottom = true;
var tolerance = 10;
function before() {
    var at = $(document).scrollTop();
    $(document).scrollTop(at + 1);
    var below = $(document).scrollTop();
    $(document).scrollTop(at - 1);
    var above = $(document).scrollTop();
    $(document).scrollTop(at);
    wasBottom = at === below && at !== above;
}
function after() {
    if (wasBottom) {
        if (!commandLine)
            return;
        var el = commandLine.get(0);
        if (el.scrollIntoView) {
            el.scrollIntoView();
        } else {
            window.scrollTop = window.scrollHeight - window.clientHeight;
        }
    }
}

Q.when(global.startTale, function () {
    $(".menu").remove();
    initialSetup();
});

})(this);
