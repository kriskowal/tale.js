(function (global) {

var Q = global["/q"];

var soundManager = global.soundManager = new SoundManager();

soundManager.url = '/js/soundmanager2/';
//soundManager.flashVersion = 9; // optional: shiny features (default = 8)
soundManager.useFlashBlock = false; // optionally, enable when you're ready to dive in
// enable HTML5 audio support, if you're feeling adventurous. iPad/iPhone will always get this.
soundManager.useHTML5Audio = true;

var focused = true; // does the window have focus?
var enabled = false; // has the user enabled music to play
var playing = false; // is music playing right now?

var update = function () {};

$(window).bind('blur', function () {
    focused = false;
    update();
});
$(window).bind('focus', function () {
    focused = true;
    update();
});

soundManager.onready(function () {
    if (!soundManager.supported())
        return;

    // display and enable music UI
    $("#music").attr({
        "class": "initialized"
    }).click(function (event) {
        event.preventDefault();
        event.stopPropagation();
        enabled = !enabled;
        $(this).attr({
            "class": "initialized" +
            (enabled ? " enabled" : "")
        });
        update();
    });

    var nextSong = "/music/6-1-euia-adventure.mp3";
    global.setMusicResponder(function (message) {
        nextSong = message;
        update();
    });

    var songs = {};
    function load(songUrl) {
        if (songs[songUrl])
            return songs[songUrl];
        return songs[songUrl] = soundManager.createSound({
            "id": songUrl,
            "url": songUrl,
            "stream": true,
            "autoLoad": true,
            "autoPlay": false,
            "onfinish": finish,
            "volume": 50
        });
    }

    function finish() {
    }

    var song;
    var songObject;
    var wasPlaying = false;
    update = function () {
        var shouldBePlaying = enabled && focused && !!nextSong;
        if (playing !== shouldBePlaying) {
            if (playing) {
                songObject.pause();
            }
        }
        if (shouldBePlaying && nextSong !== song) {
            songObject && songObject.stop();
            playing = false;
            wasPlaying = false;
            song = nextSong;
            songObject = load(song);
        }
        if (playing !== shouldBePlaying) {
            if (shouldBePlaying) {
                if (wasPlaying) {
                    songObject.resume();
                } else {
                    songObject.play();
                    wasPlaying = true;
                }
            }
        }
        playing = shouldBePlaying;
    };

    update();

});

soundManager.beginDelayedInit();

})(this);
