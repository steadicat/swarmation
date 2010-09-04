
// Module dependencies.

var express = require('express'),
connect = require('connect'),
sys = require('sys'),
io = require('./contrib/Socket.IO-node'),
http = require('http');

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
    } else {
        res.sendfile('public/index.html');
    }
});

// Error Handling

process.addListener('uncaughtException', function(e) {
    sys.log(e.stack);
});

// Player persitence
function makeRequest(method, path, message, callback) {
    message = JSON.stringify(message);
    var request = http.createClient(5984, 'swarmation.cloudant.com').request(method, '/players/' + path, { 'content-length': message ? message.length : null, authorization: 'Basic aWNoaW1tYXJldmlsaWNoaWNoYXRpb25kOlFTaXVhcENuT2huWGlTdlBTcG00RG9JcA==', host: 'swarmation.cloudant.com', 'content-type': 'application/json' });
    if (message) request.write(message);
    request.on('response', function(response) {
        var body = [];
        response.on('data', function(chunk) {
            body.push(chunk);
        });
        response.on('end', function() {
            var resp = JSON.parse(body.join(''));
            callback(resp);
        });
    });
    request.end();
}
function savePlayer(client, message, socket) {
    return;
    makeRequest('POST', '', message, function(doc) {
        if (doc.error == 'conflict') {
            sys.log('CONFLICT!');
            sys.log(message);
            sys.log(doc);
            loadPlayer(client, message, socket);
        }
        if (doc.ok == true) client.send({ type: 'save', player: doc.id, rev: doc.rev });
    });
}
function loadPlayer(client, message, socket) {
    return;
    makeRequest('GET', message._id, null, function(doc) {
        doc.type = 'info';
        doc.id = client.sessionId;
        socket.broadcast(doc);
    });
}
// IO

var ACTIVE_PLAYERS = 0;
var PLAYERS = {};

function setPlayerActive(id) {
    if (!PLAYERS[id]) ACTIVE_PLAYERS++;
    PLAYERS[id] = true;
}

function sweepPlayers() {
    ACTIVE_PLAYERS = 0;
    PLAYERS = {};
}

var socket = new io.listen(app, { resource: 'socket.io' });

function onConnect(client) {

    client.send({ type: 'welcome', id: client.sessionId });
    socket.broadcast({ type: 'connected', id: client.sessionId}, [client.sessionId]);

    client.on('message', function(message) {
        message.id = client.sessionId;
        //sys.log(JSON.stringify(message));
        socket.broadcast(message, [client.sessionId]);

        // mark players that are active
        if ((message.type == 'info') && (!message.name)) {
            setPlayerActive(client.sessionId);
        }
        if (message.type == 'formation') {
            setPlayerActive(message.id);
            for (var i in message.ids) {
                setPlayerActive(message.ids[i]);
            }
        }

        // store players
        if ((message.type == 'info') && (message.name)) {
            delete message.type;
            delete message.left;
            delete message.top;
            delete message.id;
            if (!message._id) delete message._id;
            if (message._id && (!message._rev)) {
                loadPlayer(client, message, socket);
            } else {
                savePlayer(client, message, socket);
            }
        }

    });

    client.on('disconnect', function() {
        socket.broadcast({ type: 'disconnected', id: client.sessionId});
    });
}


socket.on('connection', onConnect);

// Formation countdown

var formations = require('./public/js/formations.js').Formations;
var compileFormation = require('./public/js/forms.js').compileFormations;
formations = compileFormations(formations);

var FORMATIONS = [];
var MIN_SIZE = 3;
var MAX_SIZE = 20;
var MARGIN = 2000;

for (var i=0; i<=MAX_SIZE; i++) FORMATIONS[i] = [];

formations.forEach(function(i, id) {
    for (var i=formations[id].size; i<=MAX_SIZE; i++) {
        FORMATIONS[i].push(formations[id]);
    }
});

function pickFormation() {
    var available = FORMATIONS[Math.max(MIN_SIZE, Math.min(ACTIVE_PLAYERS, MAX_SIZE))];
    if (available.length == 0) return;
    return available[Math.floor(Math.random()*available.length)];
}

var time = 0;
setInterval(function() {
    time -= 1;
    if (time > 0) return;
    sys.log('There are '+ACTIVE_PLAYERS+' active players.');
    var formation = pickFormation();
    for (var id in socket.clients) {
        if (!PLAYERS[id]) socket.broadcast({ type: 'idle', id: id });
    }
    sweepPlayers();
    if (!formation) return;
    time = 10;
    setTimeout(function() {
        time = formation.difficulty;
        sys.log('Next formation is ' + formation.name +', of size '+(formation.size)+'.');
        socket.broadcast({ type: 'nextFormation', formation: formation.name, time: time });
    }, MARGIN);
}, 1000);

// Only listen on $ node server.js
var port = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 81;
if (!module.parent) app.listen(port);
sys.log('Server now listening on port '+port+'...');