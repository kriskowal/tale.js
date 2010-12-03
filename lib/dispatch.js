
var UTIL = require("n-util");

exports.Dispatcher = function () {

    var streams = {};
    var nextStreamId = 0;

    var send = function (location, message) {
        var stream = streams[location];
        if (!stream)
            return;
        UTIL.forEachApply(stream, function (id, send) {
            send(message);
        });
    };

    var open = function (location, id) {
        streams[location] = streams[location] || {};
        return {
            "send": function (message) {
                send(location, message);
            },
            "connect": function (send) {
                streams[location][id] = send;
            },
            "connections": function () {
                return Object.keys(streams[location]);
            },
            "close": function () {
                delete streams[location][id];
                if (!UTIL.len(streams[location]))
                    delete streams[location];
            }
        };
    };

    function status() {
        return UTIL.object(UTIL.mapApply(streams, function (location, ids) {
            return [location, Object.keys(ids)];
        }));
    }

    return {
        "open": open,
        "send": send,
        "status": status
    };
};

