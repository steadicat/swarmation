(function($, undefined) {

    var board = $('#board').get(0);
    var context = board.getContext("2d");

    var drawBoard = function() {
        // Draw vertical lines
        for (var x = 0.5; x <= board.width; x += 10) {
            context.moveTo(x, 0);
            context.lineTo(x, board.height - .5);
        }

        // Draw horizontal lines
        for (var y = 0.5; y <= board.height; y += 10) {
            context.moveTo(0, y);
            context.lineTo(board.width, y);
        }

        context.strokeStyle = "#ddd";
        context.stroke();
    }
    
    $('#board').mousedown(function(e) {
        var offset = $(board).offset();
        var x = Math.floor((e.pageX - offset.left - 2) / 10) * 10 + 1;
        var y = Math.floor((e.pageY - offset.top - 2) / 10) * 10 + 1;
        context.fillRect(x, y, 9, 9);
        sendAction('newPixel', { x: x, y: y });
    });

    $('#board').bind('newPixel', function(event, data) {
        context.fillRect(data.x, data.y, 9, 9);
    });
    
    $('#reset').click(function(e) {
        board.width = board.width;
        drawBoard();
    });

    $(document).bind('keydown', 'space', function(e) {
        console.log('space');
        return false;
    });
    $(document).bind('keydown', 'left', function(e) {
        console.log('left');
        return false;
    });
    $(document).bind('keydown', 'up', function(e) {
        console.log('up');
        return false;
    });
    $(document).bind('keydown', 'right', function(e) {
        console.log('right');
        return false;
    });
    $(document).bind('keydown', 'down', function(e) {
        console.log('down');
        return false;
    });

    // Run it
    drawBoard();

})(jQuery);
