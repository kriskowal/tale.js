(function (global, require) {

var Q = require("q");
var COLORS = require("tale/color-scheme");

global.WEB_SOCKET_SWF_LOCATION = "/js/websocket.swf";
global.SM2_DEFER = true; // soundmanager2

$(window).click(function (event) {
    var target = $(event.target);
    if (target.is('a')) {
        var command = target.attr('command');
        if (command) {
            event.stopPropagation();
            event.preventDefault();
            socketSend(command, 'command');
        }
    }
});

var responders = {
    "log": log,
    "css": css,
    "colors": colors,
    "time": time,
    "mode": mode
};

// arrange for music messages to be forwarded
// when the music system is ready
var music = Q.defer();
responders.music = music.promise;
global.setMusicResponder = music.resolve;
global.load("/music.js");

var form, prompt, commandLine;

function initialSetup() {
    var ready = Q.defer();
    $.get("command.frag.html", function (frag) {
        $(".menu").remove();
        $(frag).insertAfter($("#buffer"));
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

var send = socketSend;

var socket, retryInterval = 3;
function setup() {
    socket = new io.Socket();
    socket.connect();
    var connected = Q.defer();
    var reconnectCountdown = Q.defer();
    var reconnect = Q.defer();
    var disconnected = false;

    setTimeout(connected.reject, 3000);
    socket.on('connect', connected.resolve);
    socket.on('message', function (message) {
        if (disconnected)
            return;
        message = JSON.parse(message);
        Q.post(responders[message.to], 'call', [null, message.content]);
    });
    socket.on('disconnect', function () {
        disconnected = true;
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

function mode(mode) {
    before();
    $("body").removeClass("chat-mode command-mode").addClass(mode + '-mode');
    after();
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
    // save
    var at = $(document).scrollTop();
    // measure
    $(document).scrollTop(at + 100);
    var lower = $(document).scrollTop();
    // restore
    $(document).scrollTop(at);
    wasBottom = lower - at < 100;
}
function after() {
    console.log(wasBottom);
    if (wasBottom) {
        if (!commandLine)
            return;
        var el = $("#x-horizon").get(0);
        if (el.scrollIntoView) {
            el.scrollIntoView();
        } else {
            window.scrollTop = window.scrollHeight - window.clientHeight;
        }
    }
}

after();

Q.when(global.startTale, function () {
    initialSetup();
});

})(this, typeof exports !== 'undefined' ? require : function (name) {
    return window["/" + name];
});
