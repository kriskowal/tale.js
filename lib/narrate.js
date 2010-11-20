
var UTIL = require("n-util");

var nominals = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six',
    'seven', 'eight', 'nine', 'ten', 'eleven',
    'twelve', 'thirteen', 'fourteen', 'fifteen'
];
var ordinalSuffixes = ['st', 'nd', 'rd', 'th'];
var ordinals = [
    'first', 'second', 'third',
    'fourth', 'fifth', 'sixth', 'seventh'
];

function nominal(n) {
    if (n < nominals.length)
        return nominals[n];
    else
        return n;
}

function ordinal(n) {
    if (n < ordinals.length)
        return ordinals[n];
    else if (n / 10 % 10 === 1)
        return 'th';
    else
        return ordinalSuffixes[Math.min(3, (n + 9) % 10)];
}

function join(items, junction, basis) {
    if (items.length === 0)
        return basis;
    if (items.length === 1)
        return items[0];
    if (items.length === 2)
        return items.join(' ' + junction + ' ');
    items.push(junction + ' ' + items.pop());
    return items.join(', ');
}

exports.Narrative = function (narrator, audience) {
    var it; // most recently mentioned genderless noun
    var they; // most recently mentioned person
    var nextThey; // used to carry words like "someone"
        // over as "they" on the next identification
    var he; // most recently mentioned male person
    var she; // most recently mentioned female person
    var names = {}; // object identifiers to known names
    var genders = {}; // the genders of known creatures
    var things = {}; // object types (by singular name)
        // to lists of objects of that type that have
        // been encountered, in order, such that the
        // second person encountered can be distinguished
        // from the first.
    var directions = {}; // urls to the name of the
        // direction to reach that url
    var locations = {}; // names of locations known
        // by the audience

    function flush() {
        it = undefined;
        they = undefined;
        he = undefined;
        she = undefined;
    }

    function noun(object, subject) {
        var name, a, the, other;
        var encounters = UTIL.getset(things, object.singular, []);

        if (nextThey) {
            they = nextThey;
            nextThey = undefined;
        }

        if (!object)
            return 'nothing';

        // recognize
        if (false) {
        } else if (object.id === narrator.id) {
            if (subject && object.id === subject.id) {
                name = 'myself';
            } else if (subject) {
                name = 'me';
            } else {
                name = 'I';
            }
        } else if (object.id === audience.id) {
            if (subject && object.id === subject.id) {
                name = 'yourself';
            } else {
                name = 'you';
            }
        } else if (UTIL.has(names, object.id)) {
            name = names[object.id];
            they = undefined;
            nextThey = object.id;
        } else if (object.id === it) {
            if (subject && object.id === subject.id) {
                name = 'itself';
            } else {
                name = 'it';
            }
        } else if (object.id === she) {
            if (subject && object.id === subject.id) {
                name = 'herself';
            } else if (subject) {
                name = 'her';
            } else {
                name = 'she';
            }
        } else if (object.id === he) {
            if (subject && object.id === subject.id) {
                name = 'himself';
            } else if (subject) {
                name = 'him';
            } else {
                name = 'he';
            }
        } else if (object.id === they) {
            if (subject && object.id === subject.id) {
                name = 'themself';
            } else if (subject) {
                name = 'them';
            } else {
                name = 'they';
            }
        } else {
            // TODO describe, distinguish, generalize
            if (encounters.length === 0) {
                name = object.singular;
                a = true
            } else {
                var index = encounters.indexOf(object.id);
                if (index >= 0) {
                    if (encounters.length > 1)
                        name = ordinals[index] + ' ' + object.singular;
                    else
                        name = object.singular;
                    the = true;
                } else {
                    name = 'another ' + object.singular;
                }
            }

            // learn encountered things
            if (
                encounters.length < ordinals.length &&
                encounters.indexOf(object.id) < 0
            ) {
                encounters.push(object.id);
            }

        }

        // learn
        if (object.id !== audience.id) {
            if (UTIL.has(genders, object.id)) {
                var gender = genders[object.id];
                if (gender === "male") {
                    he = object;
                } else if (gender === "female") {
                    she = object;
                }
                it = undefined;
            } else if (object.person) {
                nextThey = object.id;
                he = undefined;
                she = undefined;
                it = undefined;
            } else if (object.creature) {
                it = undefined;
            } else {
                it = object.id;
            }
        }

        // add articles
        if (a && name === 'person') {
            name = 'someone';
            nextThey = object.id;
        } else if (the && name === 'person') {
            name = 'they';
            nextThey = object.id;
        } else if (other) {
            if (a) {
                name = 'another ' + name;
            } else if (the) {
                name = 'the other ' + name;
            } else {
                name = 'some other ' + name;
            }
        } else if (a) {
            name = object.a + ' ' + name;
        } else if (the) {
            name = 'the ' + name;
        }

        return name;
    }

    function verb(verb, subject) {
        if (
            subject.id === audience.id ||
            subject.id === narrator.id ||
            subject.id === they
        )
            return verb.verb;
            // You say, I say, they say
        else
            return verb.verbs;
            // He says, she says, it says, Joe says
    }

    function meet(person, name, gender) {
        names[person.id] = name;
        genders[person.id] = gender;
        he = undefined;
        she = undefined;
        they = undefined;
        if (gender === 'male') {
            he = person.id;
        } else if (gender === 'female') {
            she = person.id;
        } else {
            nextThey = person.id;
        }
    }

    function knows(person) {
        return UTIL.has(names, person.id);
    }

    function say(event) {
        var parts = [];
        parts.push(noun(event.subject));
        parts.push(verb(event.verb, event.subject));
        if (event.object)
            parts.push(noun(event.object, event.subject));
        if (event.verb.predicate) {
            var predicate = event.verb.predicate(event, self);
            predicate && parts.push(predicate);
        }
        var sentence = parts.join(' ');
        return sentence[0].toUpperCase() + sentence.slice(1) + '.';
    }

    function identifyPeople(ids) {
        var anonymous = 0;
        var people = [];
        var you = false;
        var me = false;
        ids.forEach(function (id) {
            if (id === narrator.id)
                me = true;
            else if (id === audience.id)
                you = true;
            else if (UTIL.has(names, id))
                people.push(names[id]);
            else
                anonymous++;
        });
        if (anonymous) {
            var name = anonymous === 1 ? 'person' : 'people';
            var quantity = nominal(anonymous);
            if (people.length || you || me)
                people.push(quantity + ' other ' + name);
            else
                people.push(quantity + ' ' + name);
        }
        if (you)
            people.unshift('you');
        if (me)
            people.push('me');
        return join(people, 'and', 'no one');
    }

    function learnDirections(_directions) {
        directions = _directions;
        console.log(_directions);
    }

    function learnLocation(location, name) {
        locations[location] = name;
    }

    function identifyLocation(location) {
        if (UTIL.has(directions, location))
            return directions[location];
        if (UTIL.has(locations, location))
            return locations[location];
    }

    var self = {
        "flush": flush,
        "meet": meet,
        "knows": knows,
        "say": say,
        "identifyPeople": identifyPeople,
        "identifyLocation": identifyLocation,
        "learnDirections": learnDirections,
        "learnLocation": learnLocation
    };

    return self;

};

