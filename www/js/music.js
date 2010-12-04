(function (global) {

global.soundManager = new SoundManager();

soundManager.url = '/js/soundmanager2/';
//soundManager.flashVersion = 9; // optional: shiny features (default = 8)
soundManager.useFlashBlock = false; // optionally, enable when you're ready to dive in
// enable HTML5 audio support, if you're feeling adventurous. iPad/iPhone will always get this.
soundManager.useHTML5Audio = true;

soundManager.onready(function () {
    if (!soundManager.supported()) {
    } else {

        var tunes = {};
        var running;
        var runningId;

        global.setMusicResponder(function (message) {
            if (runningId === message)
                return;
            if (running) {
                running.stop();
            }
            if (tunes[message]) {
                running = tunes[message];
            } else {
                running = tunes[message] = soundManager.createSound({
                    id: message,
                    url: message,
                    autoLoad: true,
                    autoPlay: false,
                    onload: function() {
                    },
                    volume: 50
                });
            }
            runningId = message;
            running.play();
        });


    }
});

soundManager.beginDelayedInit();

})(this);
