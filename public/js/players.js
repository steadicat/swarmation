var PLAYER;
var PLAYERS = {};
var MAP = [];
var Player;
var sendAction;

(function($, undefined) {
    var WIDTH = 96;
    var HEIGHT = 60;

    Player = function Player(id, left, top, isSelf) {
        this.id = id;
        this.setPosition(left, top);
        this.isSelf = isSelf;
        this.currentGoal = 0;
        this.goals = ['Easy', 'Apple Key', 'Tetris', 'Delta', 'The Tank'];
        this.formation = Formations[this.goals[this.currentGoal]];
        this.name = 'unknown';
        this.score = 0;
		this.powers = [];
    };

    Player.atPixel = function(x, y) {
        return Player.atPosition(Player.getLeft(x), Player.getTop(y));
    };

    Player.atPosition = function(left, top) {
        if (!MAP[left]) MAP[left] = [];
        return MAP[left][top];
    };

    Player.getLeft = function(x) { return Math.floor(x/10); };
    Player.getTop = function(y) { return Math.floor(y/10); };

    Player.directions = {
        left: function(left, top) { return [left-1, top] },
        right: function(left, top) { return [left+1, top] },
        up: function(left, top) { return [left, top-1] },
        down: function(left, top) { return [left, top+1] },
    };

    Player.prototype = {
        getX: function() { return this.left * 10 + 1; },
        getY: function() { return this.top * 10 + 1; },

        setPosition: function(left, top) {
            // cancel in case of collisions
            if (Player.atPosition(left, top)) return;
            // cancel if out of bounds
            if ((left < 0) || (left >= WIDTH)) return;
            if ((top < 0) || (top >= HEIGHT)) return;

            if (!MAP[this.left]) MAP[this.left] = [];
            MAP[this.left][this.top] = null;
            this.left = left;
            this.top = top;
            if (!MAP[left]) MAP[left] = [];
            MAP[left][top] = this;
            if (PLAYER) PLAYER.checkFormations();
        },
        move: function(direction) {
            var newp = Player.directions[direction](this.left, this.top);
            this.setPosition(newp[0], newp[1]);
            if (this.isSelf) {
                this.sendInfo();
            }
        },

        checkFormations: function() {
            this.checkFormation(this.formation);
        },

        checkFormation: function(formation) {
            var otherIds = [];
            var filled = true;
            for (var i = 0; i < formation.points.length; i++) {
                var dx = formation.points[i][0];
                var dy = formation.points[i][1];
                var other = Player.atPosition(this.left+dx, this.top+dy);
                if (other) {
                    otherIds.push(other.id);
                } else {
                    filled = false;
                    break;
                }
            }
            if (filled) {
                this.formationMade(formation.name);
                sendAction('formationMade', { formation: formation.name, ids: otherIds });
            }
        },

        formationMade: function(name) {
            displayNotice('You completed the ' + name + ' formation!');
            Formations[name].completed = true;
            while (Formations[this.goals[this.currentGoal]].completed) {
                this.currentGoal++;
                if (this.currentGoal >= this.goals.length) {
                    displayNotice('You completed all your formations!');
                    this.currentGoal--;
                }
            }
            this.formation = Formations[this.goals[this.currentGoal]];
        },

        usePower: function() {
			if (this.powers.length) {
				displayNotice('You used the ' + this.powers.pop() + ' power')
			} else {
				displayNotice('No powers available');
			}
        },

        sendInfo: function(isNew) {
            sendAction('playerInfo', {
                left: this.left,
                top: this.top,
                name: this.name,
                score: this.score,
                isNew: isNew
            });
        },

        getInfo: function(info) {
            this.setPosition(info.left, info.top);
            this.name = info.name;
            this.score = info.score;
        }
    };

    $('#play').bind('playerInfo', function(event, data) {
        if (!PLAYERS[data.id]) {
            PLAYERS[data.id] = new Player(data.id, data.left, data.top);
        }
        PLAYERS[data.id].getInfo(data);
        if (data.isNew) {
            PLAYER.sendInfo();
        }
    });

    $('#play').bind('playerGone', function(event, data) {
        console.log('Player ' + data.id + ' gone');
        var p = PLAYERS[data.id];
        if (!p) return;
        delete MAP[p.left][p.top];
        delete PLAYERS[data.id];
    });

    $('#play').bind('formationMade', function(event, data) {
        PLAYER.formationMade(data.formation);
    });

    // sockets

    io.setPath('/socket/');
    var socket = new io.Socket('', { transports: ['websocket', 'xhr-multipart', 'xhr-polling', 'htmlfile']});
    socket.connect();
    socket.on('message', function(data) {
        $('#play').trigger(data.type, data);
    });

    sendAction = function(type, data) {
        data.type = type;
        socket.send(data);
    };

    // init

    var initLeft = Math.floor(Math.random() * WIDTH);
    var initTop = Math.floor(Math.random() * HEIGHT);
    PLAYER = new Player('self', initLeft, initTop, true);
    var names = ['saber','tooth','moose','lion'];
    PLAYER.name = names[Math.floor(Math.random()*names.length)];
    PLAYER.sendInfo(true);

})(jQuery);
