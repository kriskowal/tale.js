(function (global, exports, require) {

    var canvas = document.createElement("canvas");
    canvas.height = 1;
    canvas.width = 1;
    if (!canvas.getContext)
        return;

    var context = canvas.getContext("2d");

    function over(under, over, mix) {
        context.clearRect(0, 0, 1, 1);
        context.globalAlpha = 1;
        context.fillStyle = under;
        context.fillRect(0, 0, 1, 1);
        context.fillStyle = over;
        context.globalAlpha = mix;
        context.fillRect(0, 0, 1, 1);
        var imageData = context.getImageData(0, 0, 1, 1);
        var data = imageData.data;
        return "rgba(" + [data[0], data[1], data[2], data[3] / 255].join(', ') + ")";
    }

    var edge = .2;
    function phase(progress, phases) {
        if (
            progress < .25 - edge ||
            progress >= .75 + edge
        ) {
            return phases.night();
        } else if (progress < .25 + edge) {
            return phases.sunrise((progress - .25 - edge) / edge / 2);
        } else if (progress < .75 - edge) {
            return phases.day();
        } else {
            return phases.sunset((progress - .75 - edge) / edge / 2);
        }
    }

    function diurnalWave(progress) {
        return phase(progress, {
            "night": function () {
                return 0;
            },
            "day": function () {
                return 1;
            },
            "sunrise": function (progress) {
                return (1 + Math.sin(Math.PI / 2 + Math.PI * progress)) / 2;
            },
            "sunset": function (progress) {
                return (1 + Math.sin(-Math.PI / 2 + Math.PI * progress)) / 2;
            }
        });
    }

    function transitionWave(progress) {
        return phase(progress, {
            "night": function () {
                return 0;
            },
            "day": function () {
                return 0;
            },
            "sunrise": function (progress) {
                return Math.sin(-Math.PI / 2 + Math.PI * progress * 2);
            },
            "sunset": function (progress) {
                return Math.sin(-Math.PI / 2 + Math.PI * progress * 2);
            }
        });
    }

    var colors = {
        "day": {
            "back": "#46b3d3",
            "fore": "#000000"
        },
        "night": {
            "back": "#1A0B2E",
            "fore": "#E4E8EB"
        }
    };

    function skyColor(time, season) {
        var x = diurnalWave(time);
        var y = transitionWave(time);
        var sunColor = "rgb(255, " + Math.floor(255 * y) + ", 0)";
        var skyColor = over(over(colors.day.back, sunColor, x * season), colors.night.back, x);
        return skyColor;
    }

    function timeColors(time, season) {
        var x = diurnalWave(time);
        var y = transitionWave(time);
        var sun = "rgb(255, " + Math.floor(255 * y) + ", 0)";
        var back = over(over(colors.day.back, sun, x * season), colors.night.back, x);
        var fore = x > .5 ? colors.night.fore : colors.day.fore;
        return {
            "back": back,
            "fore": fore
        };
    }

    exports.over = over;
    exports.skyColor = skyColor;
    exports.colors = timeColors;

})(
    this,
    typeof exports !== "undefined" ?
    exports :
    this["/tale/color-scheme"] = {},
    typeof exports !== "undefined" ?
    require :
    function (id) {
        return this["/" + id];
    }
);

