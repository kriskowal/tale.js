(function () {
    this.WEB_SOCKET_SWF_LOCATION = "/js/websocket.swf";

    var form, prompt, commandLine;

    function setup() {
        var socket = new io.Socket();
        socket.connect();

        socket.on('connect', function () {
        });
        socket.on('message', function (message) {
            log(message);
        });
        socket.on('disconnect', function () {
            log("Tale has disconnected.");
        });

        $.get("command.frag.html", function (frag) {
            $(frag).insertAfter($("#buffer"));
            $(document).scrollTop($(document).scrollTop() + 1000);
            prompt = $("#prompt");
            commandLine = $("#command-line");
            commandLine.focus();
            form = $("#command-form");
            form.submit(function () {
                var command = commandLine.val();
                socket.send(command);
                commandLine.val("").focus();
                return false;
            });
        });
    }

    var buffer = $("#buffer");
    function log(message) {
        before();
        buffer.append(message);
        after();
    }

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

    $(".menu").remove();
    setup();

})();
