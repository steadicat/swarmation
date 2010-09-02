var WIDTH = 96;
var HEIGHT = 60;
var PLAYER;
var PLAYERS = {};
var MAP = [];
var FORMATION;
var Player;
var sendAction;
var NAMES = ['Saber', 'Tooth', 'Moose', 'Lion', 'Peanut', 'Jelly', 'Thyme', 'Zombie', 'Cranberry'];

var MAX_POINTS = 14;
var QUORUM = 2;
var MARGIN = 1500;


(function($, undefined) {

    Formations = compileFormations(Formations);

    Player = function Player(id, left, top, isSelf) {
        this.id = id;

        if (!left) {
            left = Math.floor(Math.random() * WIDTH);
            top = Math.floor(Math.random() * HEIGHT);
            while (Player.atPosition(left, top)) {
                left = Math.floor(Math.random() * WIDTH);
                top = Math.floor(Math.random() * HEIGHT);
            }
        }
        this.setPosition(left, top);
        this.isSelf = isSelf;
        this.name = NAMES[Math.floor(Math.random()*NAMES.length)];
        this.score = 0;
        this.succeeded = 0;
        this.total = 0;
        this.inFormation = 0;
        this.completed = 0;
        if (isSelf) {
            this.sendInfo(true);
        }
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
        },

        move: function(direction) {
            var newp = Player.directions[direction](this.left, this.top);
            this.setPosition(newp[0], newp[1]);
            if (this.isSelf) {
                this.sendInfo();
            }
        },

        checkFormationPoints: function(points) {
            var others = [];
            for (var i in points) {
                var dx = points[i][0];
                var dy = points[i][1];
                var other = Player.atPosition(this.left+dx, this.top+dy);
                if (!other) return;
                others.push(other.id);
            }
            return others;
        },

        checkFormation: function(formation) {
            if (!this.id) return;
            for (var i in formation.points) {
                var others = this.checkFormationPoints(formation.points[i]);
                if (!others) continue;
                this.formationReported(formation.name);
                for (var id in others) if (PLAYERS[others[id]]) PLAYERS[others[id]].formationReported(formation.name);
                sendAction('formation', { formation: formation.name, ids: others });
            }
        },

        formationReported: function(name) {
            this.completed++;
        },

        formationDeadline: function() {
            this.total++;
            if (this.completed >= QUORUM) {
                this.inFormation = 15;
                this.score += FORMATION.difficulty;
                this.succeeded++;
                if (this.isSelf) {
                    displayNotice('You completed '+FORMATION.name+'. You gain '+FORMATION.difficulty+' points!');
                    $('#score .score').text(this.score);
                    $('#success .success').text(this.successRate());
                }
            } else {
                this.score = Math.max(0, this.score-(MAX_POINTS-FORMATION.difficulty));
                if (this.isSelf) {
                    displayNotice('You did not make '+FORMATION.name+'! Lose '+(MAX_POINTS-FORMATION.difficulty)+' points.');
                    $('#score .score').text(this.score);
                    $('#success .success').text(this.successRate());
                }
            }
            this.completed = 0;
        },

        successRate: function() {
            if (this.total == 0) return 100;
            return Math.round(1000.0*this.succeeded/this.total)/10;
        },

        sendInfo: function(full) {
            if (full) {
                sendAction('info', {
                    left: this.left,
                    top: this.top,
                    name: this.name,
                    score: this.score,
                    total: this.total,
                    succeeded: this.succeeded,
                    _id: $.cookie('player'),
                    _rev: this.rev
                });
            } else {
                sendAction('info', {
                    left: this.left,
                    top: this.top
                });
            }
        },

        getInfo: function(info) {
            if (info.left) this.setPosition(info.left, info.top);
            if (info.name) this.name = info.name;
            if (info.score) this.score = info.score;
            if (info.total) this.total = info.total;
            if (info.succeeded) this.succeeded = info.succeeded;
        },

        showTooltip: function() {
            $('#tooltip')
                .show()
                .css('left', this.getX()+$('#play').offset().left-6)
                .css('top', this.getY()+$('#play').offset().top+25)
                .find('.name').text(this.name).end()
                .find('.score').text(this.score).end()
                .find('.success').text(this.successRate());
        },

        hideTooltip: function() {
            $('#tooltip').hide();
        }
    };

    $('#play').bind('welcome', function(event, data) {
        if (PLAYER) return;
        setTimeout(function() {
            PLAYER = new Player(data.id, null, null, true);
        }, 2000);
    });

    $('#play').bind('info', function(event, data) {
        if (PLAYER && (data.id == PLAYER.id)) {
            PLAYER.getInfo(data);
            PLAYER.rev = data._rev;
            PLAYER.sendInfo(true);
        } else {
            if (!PLAYERS[data.id]) {
                PLAYERS[data.id] = new Player(data.id, data.left, data.top);
            }
            PLAYERS[data.id].getInfo(data);
        }
    });

    $('#play').bind('save', function(event, data) {
        $.cookie('player', data.player, { expires: 3650 });
        PLAYER.rev = data.rev;
    });

    $('#play').bind('connected', function(event, data) {
        if (PLAYER) PLAYER.sendInfo(true);
    });

    $('#play').bind('disconnected', function(event, data) {
        var p = PLAYERS[data.id];
        if (!p) return;
        delete MAP[p.left][p.top];
        delete PLAYERS[data.id];
    });

    $('#play').bind('formation', function(event, data) {
        if (!PLAYER.id) return;
        if ($.inArray(PLAYER.id, data.ids) >= 0) PLAYER.formationReported(data.formation);
        PLAYERS[data.id].formationReported(data.formation);
        for (var j = 0; j < data.ids.length; j++) {
            if (PLAYERS[data.ids[j]]) PLAYERS[data.ids[j]].formationReported(data.formation);
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
                    PLAYER.formationDeadline();
                    for (var id in PLAYERS) PLAYERS[id].formationDeadline();
                }, MARGIN);
            }
        }, data.time*1000);
    });

    // sockets

    io.setPath('/io/');
    var socket;
    socket = new io.Socket('');
    socket.connect();

    socket.on('message', function(data) {
        //console.log([data.id, data.type, data.left, data.top, data.score, data.formation, data]);
        $('#play').trigger(data.type, data);
    });

    socket.on('connect', function() {
        if (PLAYER) PLAYER.sendInfo(true);
        PLAYERS = {};
        MAP = [];
    });

    socket.on('disconnect', function() {
        var interval;
        function connect() {
            if (socket.connected) {
                clearInterval(interval);
            } else {
                socket.connect();
            }
        }
        connect();
        interval = setInterval(connect, 5000);
    });

    sendAction = function(type, data) {
        data.type = type;
        socket.send(data);
    };


})(jQuery);
