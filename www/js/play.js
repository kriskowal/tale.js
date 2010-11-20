(function (global) {

var Q = global["/q"];

this.WEB_SOCKET_SWF_LOCATION = "/js/websocket.swf";

var form, prompt, commandLine;

function initialSetup() {
    setup();

    $.get("command.frag.html", function (frag) {
        $(frag).insertAfter($("#buffer"));
        $(document).scrollTop($(document).scrollTop() + 1000);
        prompt = $("#prompt");
        commandLine = $("#command-line");
        commandLine.focus();
        form = $("#command-form");
        form.submit(function () {
            var command = commandLine.val();
            send(command);
            commandLine.val("").focus();
            return false;
        });
    });
}

var socketSend = function (message) {
    socket.send(message);
}

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
        message = JSON.parse(message);
        if (message.to === 'log') {
            log(message.content);
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
        send = reconnect.resolve;
    });

    Q.when(reconnect.promise, function () {
        setStatus("<p>Trying again&hellip;</p>");
        Q.when(setup(), function () {
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

// a hook for links that send commands
window.sendCommand = function (command) {
    var commandLine = $("#command-line")[0];
    var oldbuffer = commandLine.value;
    commandLine.value = command;
    $("#command-form").submit();
    commandLine.value = oldbuffer;
    before();
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
    statusMessage = undefined;
    setStatus(message);
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
