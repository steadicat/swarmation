var PLAYER;
var PLAYERS = {};

(function($, undefined) {

    window.Player = function Player(left, top, isSelf) {
        this.left = left;
        this.top = top;
        this.isSelf = isSelf;
        this._formIndex = 0;
        this.formation = Formations[this._formIndex];
    }

    Player.getLeft = function(x) { return Math.floor(x/10); }
    Player.getTop = function(y) { return Math.floor(y/10); }
    Player.prototype = {
        getX: function() { return this.left * 10 + 1; },
        getY: function() { return this.top * 10 + 1; },

        move: function(direction) {
            var p = this;
            var dirs = {
                left: function() { p.left-- },
                right: function() { p.left++ },
                up: function() { p.top-- },
                down: function() { p.top++ },
            };
            dirs[direction]();
            if (this.isSelf) {
                sendAction('playerMove', { left: this.left, top: this.top });
            }
            this.checkFormation();
        },

        checkFormation: function() {
            var otherIds = [];
            var filled = true;
            for (var i = 0; i < this.formation['points'].length; i++) {
                var dx = this.formation['points'][i][0];
                var dy = this.formation['points'][i][1];
                if (filled) {
                    filled = false;
                    for (var id in PLAYERS) {
                        if (PLAYERS[id].left === this.left + dx &&
                            PLAYERS[id].top === this.top + dy) {
                            filled = true;
                            otherIds.push(id);
                            break;
                        }
                    }
                } else {
                    break;
                }
            }
            if (filled) {
                displayNotice('You completed the ' + this.formation['name'] + ' formation!');
                sendAction('formationMade', { formation: this.formation['name'], ids: otherIds });
                this.formation = Formations[++this._formIndex];
                console.log('completed with ' + otherIds);
            }
        },

        usePower: function() {
            displayNotice('You used your special power');
        }
    };

    $('#play').bind('playerMove', function(event, data) {
        if (!PLAYERS[data.id]) {
            PLAYERS[data.id] = new Player(data.left, data.top);
        }
        PLAYERS[data.id].left = data.left;
        PLAYERS[data.id].top = data.top;
    });

    $('#play').bind('newPlayer', function(event, data) {
        console.log('New player ' + data.id + '');
        PLAYERS[data.id] = new Player(data.left, data.top);
        sendAction('playerMove', { left: PLAYER.left, top: PLAYER.top });
    });

    $('#play').bind('playerGone', function(event, data) {
        console.log('Player ' + data.id + ' gone');
        delete PLAYERS[data.id];
    });

    $(document).bind('keydown', 'up', function() { return false; });
    $(document).bind('keydown', 'down', function() { return false; });
    $(document).bind('keydown', 'left', function() { return false; });
    $(document).bind('keydown', 'right', function() { return false; });
    $(document).bind('keydown', 'space', function() { return false; });

    var initLeft = Math.floor(Math.random() * 96);
    var initTop = Math.floor(Math.random() * 60);
    PLAYER = new Player(initLeft, initTop, true);
    sendAction('newPlayer', { left: initLeft, top: initTop });

})(jQuery);
