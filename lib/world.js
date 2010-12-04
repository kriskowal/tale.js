
var Q = require("q");
var HTTP = require("q-http");
var UTIL = require("n-util");

function readHttpJson(location) {
    return Q.when(HTTP.read(location), function (content) {
        try {
            return JSON.parse(content);
        } catch (exception) {
            return Q.reject(exception);
        }
    });
}

exports.load = load;
function load(location) {
    return readHttpJson(location);
};

