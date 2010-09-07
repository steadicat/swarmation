var WIDTH = 96;
var HEIGHT = 60;
var PLAYER;
var PLAYERS = {};
var MAP = [];
var FORMATION;
var Player;
var sendAction;
var NAMES = ['Saber', 'Tooth', 'Moose', 'Lion', 'Peanut', 'Jelly', 'Thyme', 'Zombie', 'Cranberry'];

var MAX_POINTS = 26;
var QUORUM = 2;
var MARGIN = 1000;

var DEBUG = false;

function log(m) {
    try {
        if (DEBUG) console.log(m);
    } catch (e) {}
}

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
        this.el = $('<div class="player"></div>').appendTo('#board');
        this.setPosition(left, top);
        this.isSelf = isSelf;
        this.name = NAMES[Math.floor(Math.random()*NAMES.length)];
        this.score = 0;
        this.succeeded = 0;
        this.total = 0;
        this.completed = 0;
        if (isSelf) {
            this.el.addClass('self');
            this.load();
            this.sendInfo();
        }
        var p = this;
        this.el.hover(function() {
            p.showTooltip();
        }, function() {
            p.hideTooltip();
        });
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

            this.el.css({ left: this.getX(), top: this.getY() });
        },

        move: function(direction) {
            var newp = Player.directions[direction](this.left, this.top);
            this.setPosition(newp[0], newp[1]);
            if (this.isSelf) {
                this.sendInfo();
                this.el.removeClass('idle');
            }
        },

        flash: function() {
            var player = this;
            player.el.addClass('flash');
            setTimeout(function() {
                player.el.removeClass('flash');
            }, 200);
            if (this.isSelf) sendAction('flash', {});
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
                this.el.addClass('active');
                var el = this.el;
                setTimeout(function() {
                    el.removeClass('active');
                }, 1000);
                this.score += FORMATION.difficulty;
                this.succeeded++;
                if (this.isSelf) {
                    displayNotice('You completed '+FORMATION.name+'. You gain '+FORMATION.difficulty+' points!');
                }
                this.el.removeClass('idle');
            } else {
                var delta = Math.round((MAX_POINTS-FORMATION.difficulty)/2);
                this.score = Math.max(0, this.score-delta);
                if (this.isSelf) {
                    displayNotice('You did not make '+FORMATION.name+'! Lose '+delta+' points.');
                }
            }
            this.completed = 0;
            if (this.isSelf) {
                // save occasionally
                if (Math.random() < 0.3) this.save();
                $('#score .score').text(this.score);
                $('#success .success').text(this.successRate());
            }
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
                    succeeded: this.succeeded
                });
            } else {
                // rate limiting
                var p = this;
                if (this.timeout) return;
                this.timeout = setTimeout(function() {
                    sendAction('info', {
                        left: p.left,
                        top: p.top
                    });
                    p.timeout = null;
                }, 100);
            }
        },

        load: function() {
            sendAction('load', { player: $.cookie('player') });
        },

        save: function() {
            displayNotice('Your score has been saved.');
            sendAction('save', {
                name: this.name,
                score: this.score,
                total: this.total,
                succeeded: this.succeeded,
                _id: $.cookie('player'),
                _rev: this.rev
            });
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
                .css('left', this.getX()+$('#board').offset().left-6)
                .css('top', this.getY()+$('#board').offset().top+25)
                .find('.name').text(this.name).end()
                .find('.score').text(this.score).end()
                .find('.success').text(this.successRate());
        },

        hideTooltip: function() {
            $('#tooltip').hide();
        }
    };

    var board = $('#board');

    function loadPlayer(data) {
        if (!PLAYERS[data.id]) {
            PLAYERS[data.id] = new Player(data.id, data.left, data.top);
        }
        if (!data.name) PLAYERS[data.id].el.removeClass('idle');
        PLAYERS[data.id].getInfo(data);
    }

    board.bind('welcome', function(event, data) {
        for (id in data.players) loadPlayer(data.players[id]);
        if (PLAYER) {
            PLAYER.id = data.id;
        } else {
            PLAYER = new Player(data.id, null, null, true);
        }
    });

    board.bind('info', function(event, data) {
        if (PLAYER && (data.id == PLAYER.id)) {
            PLAYER.getInfo(data);
            PLAYER.rev = data._rev;
        } else {
            loadPlayer(data);
        }
    });

    board.bind('flash', function(event, data) {
        if (PLAYERS[data.id]) PLAYERS[data.id].flash();
    });

    board.bind('idle', function(event, data) {
        if (PLAYERS[data.id]) PLAYERS[data.id].el.addClass('idle');
        if (PLAYER && (data.id == PLAYER.id)) PLAYER.el.addClass('idle');
    });

    board.bind('saved', function(event, data) {
        $.cookie('player', data.player, { expires: 3650 });
        PLAYER.rev = data.rev;
    });

    board.bind('connected', function(event, data) {
        //if (PLAYER) PLAYER.sendInfo(true);
    });

    board.bind('disconnected', function(event, data) {
        var p = PLAYERS[data.id];
        if (!p) return;
        delete MAP[p.left][p.top];
        PLAYERS[data.id].el.remove();
        delete PLAYERS[data.id];
    });

    board.bind('formation', function(event, data) {
        if ((!PLAYER) || (!PLAYER.id)) return;
        if ($.inArray(PLAYER.id, data.ids) >= 0) PLAYER.formationReported(data.formation);
        PLAYERS[data.id].formationReported(data.formation);
        for (var j = 0; j < data.ids.length; j++) {
            if (PLAYERS[data.ids[j]]) {
                PLAYERS[data.ids[j]].formationReported(data.formation);
            }
        }
    });

    board.bind('nextFormation', function(event, data) {
        FORMATION = Formations[data.formation];
        $('#formation')
            .css('background', 'url(http://djdtqy87hg7ce.cloudfront.net/images/formations/'+data.formation+'.png) no-repeat center top')
            .text(data.formation).end();

        var timeleft = data.time;
        $('#countdown').text(timeleft);

        var interval = setInterval(function() {
            timeleft--;
            $('#countdown').text(timeleft);
        }, 1000);

        setTimeout(function() {
            if (FORMATION) {
                PLAYER.checkFormation(FORMATION);
                setTimeout(function() {
                    PLAYER.formationDeadline();
                    for (var id in PLAYERS) PLAYERS[id].formationDeadline();
                    clearInterval(interval);
                    $('#countdown').text('0');
                }, MARGIN);
            }
        }, data.time*1000 - MARGIN);
    });

    var RESTARTING = false;

    board.bind('restart', function(event, data) {
        RESTARTING = true;
        socket.disconnect();
        alert('Swarmation needs to restart for an update. Please reload the page.');
    });

    // sockets

    io.setPath('/io/');
    var socket = new io.Socket();
    socket.connect();

    socket.on('message', function(data) {
        log([data.id, data.type, data.left, data.top, data.score, data.succeeded, data.formation, data]);
        board.trigger(data.type, data);
    });

    socket.on('connect', function() {
        if (PLAYER) PLAYER.sendInfo(true);
        for (var id in PLAYERS) PLAYERS[id].el.remove();
        PLAYERS = {};
        MAP = [];
    });

    socket.on('disconnect', function() {
        if (RESTARTING) return;
        var interval;
        function connect() {
            if (socket.connected) {
                clearInterval(interval);
            } else {
                socket.connect();
            }
        }
        connect();
        interval = setInterval(connect, 1000);
    });

    sendAction = function(type, data) {
        data.type = type;
        log(['sending', data.type, data.left, data.top, data.score, data.succeeded, data.formation, data]);
        socket.send(data);
    };


})(jQuery);
