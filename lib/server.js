
var PROCESS = process;
var SOCKET = require("socket.io");
var Q = require("q-util");
var HTTP = require("q-http");
var FS = require("q-fs");
var JAQUE = require("jaque");
var ENGINE = require("./engine");

var engine = ENGINE.engine;
var dispatcher = ENGINE.dispatcher;

var port = PROCESS.argv[2] || 80;

var app = JAQUE.Branch({
    "": JAQUE.File("www/index.html"),
    "index.html": JAQUE.PermanentRedirect("/"),
    "status.json": JAQUE.Json(function (request) {
        return dispatcher.status();
    }),
    "index.js": JAQUE.FileConcat([
        "www/js/q.js",
        "www/js/index.js"
    ], 'application/javascript'),
    "play.js": JAQUE.FileConcat([
        "www/js/jquery-1.4.3.min.js",
        "www/js/json2.js",
        "www/js/socket.io.js",
        "www/js/color-scheme.js",
        "www/js/play.js"
    ], 'application/javascript'),
    "music.js": JAQUE.FileConcat([
        "www/js/soundmanager2.js",
        "www/js/music.js"
    ], 'application/javascript'),
    "world": JAQUE.FileTree("world")
}, JAQUE.FileTree("www"))

var server = HTTP.Server(JAQUE.Decorators([
    JAQUE.Error,
    JAQUE.Log,
    JAQUE.ContentLength
], app));

var webSocket = SOCKET.listen(server.nodeServer);

var connect = function (server, connect, startUrl) {
    server.on('connection', function (client) {
        var q = Q.Queue();
        var disconnected = Q.defer();
        client.on('message', q.put);
        client.on('disconnect', disconnected.resolve);
        connect({
            "send": function (message) {
                client.send(message);
            },
            "receive": q.get,
            "disconnected": disconnected.promise
        }, startUrl);
    });
};

Q.when(server.listen(port), function () {
    console.log("Server listening on " + port);
    return Q.when(engine.start(), function (running) {
        console.log("World started.");

        connect(webSocket, engine.connect, "http://localhost:" + port + "/world/dya.json");

        var siginted;
        PROCESS.on("SIGINT", function () {
            if (siginted)
                throw new Error("Force-stopped.");
            siginted = true;
            running.stop();
        });

        return Q.when(running.stopped, function () {
            console.log("World stopped");
            return Q.when(server.stop(), function () {
                console.log("Server stopped");
            });
        });

    });
}, Q.error);

