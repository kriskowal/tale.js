
var PROCESS = process;
var SOCKET = require("socket.io");
var Q = require("q-util");
var HTTP = require("q-http");
var FS = require("q-fs");
var JAQUE = require("jaque");
var world = require("./world").world;

var port = 80;

var app = JAQUE.Branch({
    "": JAQUE.File("www/index.html"),
    "index.html": JAQUE.PermanentRedirect("/"),
    "play.js": JAQUE.FileConcat([
        "www/js/jquery-1.4.3.min.js",
        "www/js/socket.io.js",
        "www/js/play.js"
    ], 'application/javascript'),
    "world": JAQUE.FileTree("world")
}, JAQUE.FileTree("www"))

var server = HTTP.Server(JAQUE.Decorators([
    JAQUE.Error,
    JAQUE.Log,
    JAQUE.ContentLength
], app));

var webSocket = SOCKET.listen(server.nodeServer);

var connect = function (server, connect) {
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
        });
    });
};

Q.when(server.listen(port), function () {
    console.log("Server listening on " + port);
    return Q.when(world.start(), function (worldRunner) {
        console.log("World started.");

        connect(webSocket, world.connect);

        var siginted;
        PROCESS.on("SIGINT", function () {
            if (siginted)
                throw new Error("Force-stopped.");
            siginted = true;
            worldRunner.stop();
        });

        return Q.when(worldRunner.stopped, function () {
            console.log("World stopped");
            return Q.when(server.stop(), function () {
                console.log("Server stopped");
            });
        });

    });
}, Q.error);

