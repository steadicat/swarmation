
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

socket.on('connection', function(client) {
    client.on('message', function(m) {
        m.id = client.sessionId;
        socket.clients.forEach(function(client) {
            if (!client) return;
            if (client.sessionId == m.id) return;
            client.send(m);
        });
    });
    client.on('disconnect', function() { console.log('disconnect'); });
});

// Only listen on $ node app.js

var port = parseInt(process.argv[2], 10) || 80;
if (!module.parent) app.listen(port);
console.log('Server now listening on port '+port+'...');