var PLAYER;
var PLAYERS = {};

(function($, undefined) {

    window.Player = function Player(left, top, isSelf) {
        this.left = left || 100;
        this.top = top || 100;
        this.isSelf = isSelf;
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
    };

    $('#play').bind('playerMove', function(event, data) {
        if (!PLAYERS[data.id]) PLAYERS[data.id] = new Player(data.left, data.top);
        PLAYERS[data.id].left = data.left;
        PLAYERS[data.id].top = data.top;
    });

    window.createPlayer = function(left, top) {
        PLAYER = new Player(left, top, true);
        PLAYERS['self'] = PLAYER;
        sendAction('newPlayer', { left: left, top: top });
        return PLAYER;
    }

    $('#play').bind('newPlayer', function(event, data) {
        console.log('New player ' + data.id);
        PLAYERS[data.id] = new Player(data.left, data.top);
        sendAction('playerMove', { left: PLAYER.left, top: PLAYER.top });
    });

    $(document).bind('keydown', 'up', function() { return false; });
    $(document).bind('keydown', 'down', function() { return false; });
    $(document).bind('keydown', 'left', function() { return false; });
    $(document).bind('keydown', 'right', function() { return false; });

})(jQuery);
