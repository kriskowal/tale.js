
var UTIL = require("n-util");

exports.Thing = Thing = function (attributes) {
    var self = Object.create(Thing.prototype);
    UTIL.update(self, attributes);
    return self;
};

Object.defineProperty(Thing.prototype, 'a', {
    "get": function () {
        if ("aeiou".indexOf(this.singular[0]) >= 0)
            return 'an';
        else
            return 'a';
    }
});

Object.defineProperty(Thing.prototype, 'plural', {
    "get": function () {
        return this.singular + UTIL.get({
            "s": "es",
            "x": "es"
        }, UTIL.last(this.singular), 's');
    }
});

Thing.prototype.collective = 'collection';

function main() {
    var thing = Thing({
        "singular": "ax"
    });
    console.log(thing.a + ' ' + thing.singular);
    console.log(thing.plural);
}

if (module === require.main)
    main();
