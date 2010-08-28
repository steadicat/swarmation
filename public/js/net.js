io.setPath('/socket/');

socket = new io.Socket('swarmation.com', { transports: ['websocket', 'xhr-multipart', 'xhr-polling', 'htmlfile']});
socket.connect();
socket.on('message', function(data) {
    if (data.event == 'newPixel') {
        $('#board').trigger('receivePixel', [data.x, data.y]);
    }
});

$('#board').bind('newPixel', function(event, x, y) {
    socket.send({ event: 'newPixel', x: x, y: y });
});