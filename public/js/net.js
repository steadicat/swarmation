(function($, undefined) {

    io.setPath('/socket/');

    socket = new io.Socket('', { transports: ['websocket', 'xhr-multipart', 'xhr-polling', 'htmlfile']});
    socket.connect();
    socket.on('message', function(data) {
        $('#board').trigger(data.type, data);
    });

    window.sendAction = function(type, data) {
        data.type = type;
        socket.send(data);
    };

})(jQuery);

