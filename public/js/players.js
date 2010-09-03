var PLAYER;
var PLAYERS = {};
var MAP = [];
var FORMATION_COMPLETED;
var FORMATION;
var Player;
var sendAction;
var NAMES = ['Saber', 'Tooth', 'Moose', 'Lion', 'Peanut', 'Jelly', 'Thyme', 'Zombie', 'Cranberry'];

var MARGIN = 1500;

function log(m) {
    try { console.log(m); } catch (e) {}
}

(function($, undefined) {
    var WIDTH = 96;
    var HEIGHT = 60;

    Player = function Player(id, left, top, isSelf) {
        this.id = id;
        this.setPosition(left, top);
        this.isSelf = isSelf;
        this.currentGoal = 0;
        this.goals = ['Easy', 'Apple Key', 'Tetris', 'Delta', 'The Tank', 'Block', 'Fortress', 'Snake', 'Lobster', 'Hat', 'Home', 'Table', 'Patchwork', 'Spiral', 'Volcano'];
        this.formation = Formations[this.goals[this.currentGoal]];
        this.name = NAMES[Math.floor(Math.random()*NAMES.length)];
        this.score = 0;
        this.powers = [];
		this.inFormation = 0;
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
            //if (PLAYER) PLAYER.checkFormations();
        },
        move: function(direction) {
            var newp = Player.directions[direction](this.left, this.top);
            this.setPosition(newp[0], newp[1]);
            if (this.isSelf) {
                this.sendInfo();
            }
        },

        checkFormations: function() {
            var p = this;
            if (p.timeout) return;
            p.timeout = setTimeout(function() {
                p.timeout = null;
                for (var id in Formations) {
                    p.checkFormation(Formations[id]);
                };
            }, 1000);
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
				for (var j = 0; j < otherIds.length; j++) {
					PLAYERS[otherIds[j]].inFormation = 10;
				}
            }
            return filled;
        },

        formationMade: function(name) {
			this.inFormation = 10;
            if (name == FORMATION.name) FORMATION_COMPLETED = true;
            if (!Formations[name].completed) {
                //displayNotice('You completed the ' + name + ' formation!');
                Formations[name].completed = true;
                this.powers.push(Formations[name].power);
                // brag about your achievement
                this.sendInfo();
            }
        },

        usePower: function() {
            var power;
            if (this.powers.length) {
                power = this.powers.pop();
                //power.use(this);
                displayNotice('You used the ' + power.name + ' power')
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
        },

        showTooltip: function() {
            $('#tooltip')
                .show()
                .css('left', this.getX()+$('#play').offset().left-6)
                .css('top', this.getY()+$('#play').offset().top+25)
                .find('.name').text(this.name).end()
                .find('.score').text(this.score);
        },

        hideTooltip: function() {
            $('#tooltip').hide();
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
        var p = PLAYERS[data.id];
        if (!p) return;
        delete MAP[p.left][p.top];
        delete PLAYERS[data.id];
    });

    $('#play').bind('formationMade', function(event, data) {
        if (data.you) PLAYER.formationMade(data.formation);
        PLAYERS[data.id].inFormation = 10;
		for (var j = 0; j < data.ids.length; j++) {
			if (PLAYERS[data.ids[j]]) PLAYERS[data.ids[j]].inFormation = 10;
		}
    });

    $('#play').bind('nextFormation', function(event, data) {
        FORMATION = Formations[data.formation];
        $('#formation')
            .css('background', 'url(/images/formations/'+data.formation.toLowerCase()+'.png) no-repeat center top')
            .text(data.formation).end();
        var timeleft = data.time;
        $('#countdown').text(timeleft);
        var interval = setInterval(function() {
            timeleft--;
            $('#countdown').text(timeleft);
        }, 1000);
        setTimeout(function() {
            clearInterval(interval);
            $('#countdown').text('0');
            if (FORMATION) {
                PLAYER.checkFormation(FORMATION);
                setTimeout(function() {
                    var delta;
                    if (FORMATION_COMPLETED) {
                        delta = FORMATION.points.length+1;
                        PLAYER.score += delta;
                        displayNotice('You completed '+FORMATION.name+'. You gain '+delta+' points!');
                    } else {
                        delta = 10-(FORMATION.points.length+1);
                        PLAYER.score -= delta;
                        if (PLAYER.score < 0) PLAYER.score = 0;
                        displayNotice('You did not make '+FORMATION.name+'! Lose '+delta+' points.');
                    }
                    $('#score .score').text(PLAYER.score);
                    PLAYER.sendInfo();
                    FORMATION_COMPLETED = false;
                }, MARGIN);
            }
        }, data.time*1000);
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
    PLAYER.sendInfo(true);

})(jQuery);
