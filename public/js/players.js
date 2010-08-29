var PLAYER;
var PLAYERS = {};
var MAP = [];
var PREVIOUS_FORMATION;
var FORMATION_COMPLETED;
var FORMATION;
var Player;
var sendAction;

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
        this.goals = ['Easy', 'Apple Key', 'Tetris', 'Delta', 'The Tank', 'Block', 'Fortress', 'Snake', 'Lobster'];
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
            }
            return filled;
        },

        formationMade: function(name) {
            if (!Formations[name].completed) {
                //displayNotice('You completed the ' + name + ' formation!');
                Formations[name].completed = true;
                this.score++;
                this.powers.push(Formations[name].power);
                while (Formations[this.goals[this.currentGoal]].completed) {
                    this.currentGoal++;
                    if (this.currentGoal >= this.goals.length) {
                        displayNotice('You completed all your formations!');
                        this.currentGoal--;
                    }
                }
                this.formation = Formations[this.goals[this.currentGoal]];
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
        PLAYER.formationMade(data.formation);
        if (data.formation == PREVIOUS_FORMATION.name) FORMATION_COMPLETED = true;
    });

    $('#play').bind('nextFormation', function(event, data) {
        PREVIOUS_FORMATION = FORMATION;
        FORMATION = Formations[data.formation];
        displayNotice('You have 10 seconds to form the '+data.formation+' formation!')
        setTimeout(function() {
            if (PREVIOUS_FORMATION) {
                PLAYER.checkFormation(PREVIOUS_FORMATION);
                setTimeout(function() {
                    if (FORMATION_COMPLETED) {
                        displayNotice('You are safe.');
                    } else {
                        displayNotice('You did not make the formation!');
                    }
                    FORMATION_COMPLETED = false;
                }, 1500);
            }
        }, 10000);
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
