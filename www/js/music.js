(function (global) {

var Q = global["/q"];

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
        var song;
        var songId;
        var initialized = Q.defer();
        var playing = false;
        var started = false;
        var focused = true;
        var muted = false;

        $(window).bind('blur', function () {
            focused = false;
            update();
        });
        $(window).bind('focus', function () {
            focused = true;
            update();
        });

        function update() {
            if (song) {
                if (focused && !muted) {
                    if (!playing) {
                        if (!started) {
                            song.play();
                            started = true;
                        } else {
                            song.resume();
                        }
                        playing = true;
                    } else {
                        song.pause();
                    }
                } else {
                    if (playing) {
                        song.pause();
                        playing = false;
                    }
                }
            }
        }

        Q.when(initialized.promise, function () {
            $("#music").attr({
                "class": "playing"
            }).click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (!muted) {
                    $(this).attr({"class": "paused"});
                } else {
                    $(this).attr({"class": "playing"});
                }
                muted = !muted;
                update();
            });
        });

        global.setMusicResponder(function (message) {
            if (songId === message)
                return;
            if (song)
                song.stop();
            if (tunes[message]) {
                song = tunes[message];
            } else {
                song = tunes[message] = soundManager.createSound({
                    "id": message,
                    "url": message,
                    "loops": Infinity,
                    "stream": true,
                    "autoLoad": true,
                    "autoPlay": false,
                    "onfinish": function () {
                        song && song.play();
                    },
                    "volume": 50
                });
            }
            songId = message;
            started = false;
            update();
            // display the music UI after the first song starts
            initialized.resolve();
        });

    }
});

soundManager.beginDelayedInit();

})(this);
