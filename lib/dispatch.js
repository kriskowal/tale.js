
var UTIL = require("n-util");

exports.Dispatcher = function () {

    var streams = {};
    var nextStreamId = 0;

    var dispatch = function (location, message) {
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
                dispatch(location, message);
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

    return {"open": open};
};

