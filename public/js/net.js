io.setPath('/socket');

socket = new io.Socket('localhost');
socket.connect();
socket.send('some data');
socket.on('message', function(data) {
    alert('got some data ' + data);
});