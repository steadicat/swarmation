
/**
 * Module dependencies.
 */

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

// IO
var socket = new io.listen(app, { resource: 'socket' });

var clients = [];

function contains(l, x) {
    for (var i in l) {
        if (l[i] == x) return true;
    }
    return false;
};

var PLAYERS = 0;

socket.on('connection', function(client) {
    PLAYERS++;
    client.on('message', function(m) {
        m.id = client.sessionId;
        sys.puts(m.id + ' says ' + m.type);
        socket.clients.forEach(function(client) {
            if (!client) return;
            if (client.sessionId == m.id) return;
            // if 'ids' is set, only send to those clients
            if (m.ids && (!contains(m.ids, client.sessionId))) return;
            client.send(m);
        });
    });
    client.on('disconnect', function() {
        PLAYERS--;
        socket.clients.forEach(function(c) {
            if (!c) return;
            if (c.sessionId == client.sessionId) return;
            c.send({ type: 'playerGone', id: client.sessionId});
        });
    });
});

// Formation countdown

var formations = require('./public/js/forms.js').Formations;
var FORMATIONS = [];
var MAX_SIZE = 20;
for (var i=0; i<=MAX_SIZE; i++) FORMATIONS[i] = [];

formations.forEach(function(i, id) {
    var formation = formations[id];
    for (var i=formation.points.length+2; i<=MAX_SIZE; i++) {
        FORMATIONS[i].push(formation);
    }
});

function pickFormation() {
    var available = FORMATIONS[Math.min(PLAYERS, MAX_SIZE)];
    if (available.length == 0) return;
    return available[Math.floor(Math.random()*available.length)];
}
setInterval(function() {
    var formation = pickFormation();
    if (!formation) return;
    console.log('Next formation is ' + formation.name);
    socket.clients.forEach(function(client) {
        if (!client) return;
        client.send({ type: 'nextFormation', formation: formation.name });
    });
}, 12000);

// Only listen on $ node app.js

var port = parseInt(process.env.PORT) || parseInt(process.argv[2], 10) || 8000;
if (!module.parent) app.listen(port);
console.log('Server now listening on port '+port+'...');