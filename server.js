
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
    } else {
        res.sendfile('public/index.html');
    }
});

// Error Handling

process.addListener('uncaughtException', function(e) {
    console.log(e.stack);
});

// IO

var PLAYERS = 0;
var socket = new io.listen(app, { resource: 'socket.io' });

function onConnect(client) {
    PLAYERS++;
    client.send({ type: 'welcome', id: client.sessionId });
    socket.broadcast({ type: 'connected', id: client.sessionId}, [client.sessionId]);

    client.on('message', function(message) {
        message.id = client.sessionId;
        //sys.log(JSON.stringify(message));
        socket.broadcast(message, [client.sessionId]);
    });

    client.on('disconnect', function() {
        PLAYERS--;
        socket.broadcast({ type: 'disconnected', id: client.sessionId});
    });
}


socket.on('connection', onConnect);

// Formation countdown

var formations = require('./public/js/forms.js').Formations;
var FORMATIONS = [];
var MAX_SIZE = 20;
var MARGIN = 3000;

for (var i=0; i<=MAX_SIZE; i++) FORMATIONS[i] = [];

formations.forEach(function(i, id) {
    var formation = formations[id];
    for (var i=formation.points.length+1; i<=MAX_SIZE; i++) {
        FORMATIONS[i].push(formation);
    }
});

function pickFormation() {
    var available = FORMATIONS[Math.min(PLAYERS, MAX_SIZE)];
    if (available.length == 0) return;
    return available[Math.floor(Math.random()*available.length)];
}

var time = 0;
setInterval(function() {
    time -= 1;
    if (time > 0) return;
    var formation = pickFormation();
    if (!formation) return;
    time = 10;
    setTimeout(function() {
        sys.log('Next formation is ' + formation.name);
        time = 2*(formation.points.length+1);
        socket.clients.forEach(function(client) {
            if (!client) return;
            client.send({ type: 'nextFormation', formation: formation.name, time: time });
        });
    }, MARGIN);
}, 1000);

// Only listen on $ node server.js
var port = parseInt(process.env.PORT) || 81;
if (!module.parent) app.listen(port);
sys.log('Server now listening on port '+port+'...');