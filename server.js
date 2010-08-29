
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

// IO
var socket = new io.listen(app, { resource: 'socket' });

var clients = [];

function contains(l, x) {
    for (var i in l) {
        if (l[i] == x) return true;
    }
    return false;
};

socket.on('connection', function(client) {
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
        socket.clients.forEach(function(c) {
            if (!c) return;
            if (c.sessionId == client.sessionId) return;
            c.send({ type: 'playerGone', id: client.sessionId});
        });
    });
});

// Only listen on $ node app.js

var port = parseInt(process.argv[2], 10) || 80;
if (!module.parent) app.listen(port);
console.log('Server now listening on port '+port+'...');