var PLAYER;
var PLAYERS = {};

(function($, undefined) {

    window.Player = function Player(left, top, isSelf) {
        this.left = left || 100;
        this.top = top || 100;
        this.isSelf = isSelf;
        this.formation = 'easy';
    }

    Player.getLeft = function(x) { return Math.floor(x/10); }
    Player.getTop = function(y) { return Math.floor(y/10); }
    Player.prototype.getX = function() { return this.left*10+1; }
    Player.prototype.getY = function() { return this.top*10+1; }

    Player.prototype.move = function(direction) {
        var p = this;
        var dirs = {
            left: function() { p.left-- },
            right: function() { p.left++ },
            up: function() { p.top-- },
            down: function() { p.top++ },
        };
        dirs[direction]();
        if (this.isSelf) sendAction('playerMove', { left: this.left, top: this.top });
		this.checkFormation();
    };

    Player.prototype.checkFormation = function() {
        var filled = true;
        for (var i = 0; i < Formations[this.formation]['points'].length; i++) {
			if (filled) {
	            filled = false;
	            for (var id in PLAYERS) {
	                if (PLAYERS[id].left === this.left + i[0] &&
	                    PLAYERS[id].top === this.top + i[1]) {
	                    filled = true;
	                    break;
	                }
	            }
			} else {
				break;
			}
        }
        if (filled) {
            displayNotice('You completed the ' + this.formation + ' formation!');
        }
    };

    $('#play').bind('playerMove', function(event, data) {
        if (!PLAYERS[data.id]) {
            PLAYERS[data.id] = new Player(data.left, data.top);
        }
        PLAYERS[data.id].left = data.left;
        PLAYERS[data.id].top = data.top;
    });

    window.createPlayer = function(left, top) {
        PLAYER = new Player(left, top, true);
        sendAction('newPlayer', { left: left, top: top });
        return PLAYER;
    }

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

    PLAYER = createPlayer(Math.floor(Math.random()*96), Math.floor(Math.random()*60));

})(jQuery);
