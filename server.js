var DEBUG = false;

// Module dependencies.

var express = require('express'),
connect = require('connect'),
sys = require('sys'),
io = require('./contrib/Socket.IO-node');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.use(connect.bodyDecoder());
    app.use(connect.methodOverride());
    app.use(app.router);
    app.use(connect.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(connect.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(connect.errorHandler());
});

// Routes

app.get('/', function(req, res) {
    if (req.header('host') == 'saber-tooth-moose-lion.no.de') {
        res.redirect('http://swarmation.com/');
    } if (req.header('host') == 'www.swarmation.com') {
        res.redirect('http://swarmation.com/');
    }/* else if ((req.header('host') == 'swarmation.com') && (Math.random() >= 0.5)) {
        res.redirect('http://www2.swarmation.com/');
    }*/ else {
        res.sendfile('public/index.html');
    }
});

// Error Handling

process.on('uncaughtException', function(e) {
    sys.log(e.stack);
});

process.on('SIGINT', function() {
    if (socket) socket.broadcast({ type: 'restart' });
    setTimeout(function() {
        process.exit();
    }, 2000);
});

// Model
var players = require('./players');
var PLAYERS = players.PLAYERS;
var Player = players.Player;

// IO

var socket = new io.listen(app, { resource: 'socket.io' });

function onConnect(client) {

    client.send({ type: 'welcome', id: client.sessionId, players: Player.getList() });
    if (FORMATION && (TIME > 0)) client.send({ type: 'nextFormation', formation: FORMATION.name, time: TIME });

    client.on('message', function(message) {
        message.id = client.sessionId;
        if (DEBUG) sys.log(JSON.stringify(message));

        var player = Player.get(client);

        // cache state for new clients
        if (message.type == 'info') player.setInfo(message);

        // mark players that are active
        if ((message.type == 'info') && (!message.name)) player.setActive();

        if (message.type == 'formation') {
            player.setActive();
            for (var i in message.ids) {
                Player.byId(message.ids[i]).setActive();
            }
        }

        // store players
        if (message.type == 'save') {
            player.save(message);
        } else if (message.type == 'load') {
            player.load(message.player);
        } else {
            client.broadcast(message);
        }

    });

    client.on('disconnect', function() {
        Player.get(client).disconnect(socket);
    });
}


socket.on('connection', onConnect);

// Formation countdown

var formations = require('./public/js/formations.js').Formations;
var compileFormation = require('./public/js/forms.js').compileFormations;
formations = compileFormations(formations);

var FORMATIONS = [];
var FORMATION;
var MIN_SIZE = 3;
var MAX_SIZE = 20;
var MARGIN = 2000;

for (var i=0; i<=MAX_SIZE; i++) FORMATIONS[i] = [];

for (var id in formations) {
    for (var i=formations[id].size; i<=MAX_SIZE; i++) {
        FORMATIONS[i].push(formations[id]);
    }
};

function pickFormation() {
    var available = FORMATIONS[Math.max(MIN_SIZE, Math.min(Player.getActive(), MAX_SIZE))];
    if (available.length == 0) return;
    return available[Math.floor(Math.random()*available.length)];
}

var TIME = 1;
setInterval(function() {
    TIME -= 1;
    if (TIME != 0) return;
    Player.endTurn(socket);
    sys.log('There are '+Player.getActive()+' active players.');
    FORMATION = pickFormation();
    if (!FORMATION) return;
    TIME = -1;
    setTimeout(function() {
        TIME = FORMATION.difficulty;
        sys.log('Next formation is ' + FORMATION.name +', of size '+(FORMATION.size)+'.');
        socket.broadcast({ type: 'nextFormation', formation: FORMATION.name, time: TIME });
    }, MARGIN);
}, 1000);

// Only listen on $ node server.js
var port = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 81;
if (!module.parent) app.listen(port);
sys.log('Server now listening on port '+port+'...');