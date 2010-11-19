(function () {

var canvas = document.createElement('canvas');
if (!canvas.getContext)
    return;

var stopped = false;
this.stopGratuitousTaleRotation = function () {
    stopped = true;
};

var rate = Math.PI * 2 / 300000 / 4;

var quantum = 100;
var animate = function (functor) {
    var start = new Date().getTime();
    var previous;
    var tick = function () {
        if (stopped)
            return;
        try {
            var before = new Date().getTime();
            var position = (before - start) * rate;
            functor(position);
        } finally {
            setTimeout(tick, quantum);
        }
    };
    tick();
};

var ready = function () {
    if (!dya.ready || !dyo.ready)
        return;

    var img = document.getElementById('tale');

    canvas.width = 360;
    canvas.height = 360;

    // legerdemain
    var parentNode = img.parentNode;
    parentNode.removeChild(img);
    parentNode.appendChild(canvas);

    var context = canvas.getContext('2d');
    context.translate(180, 180);
    context.drawImage(img, -180, -180, 360, 360);

    animate(function (delta) {
        context.save();
        context.clearRect(-180, -180, 360, 360);
        context.drawImage(dyo, -180, -180, 360, 360);
        context.rotate(delta);
        context.drawImage(dya, -180, -180, 360, 360);
        context.restore();
    });

};

var dyo = new Image();
var dya = new Image();
dya.onload = function () {dya.ready = true; ready()};
dyo.onload = function () {dyo.ready = true; ready()};
dyo.src = "/art/dyo.png";
dya.src = "/art/dya.png";

})();
