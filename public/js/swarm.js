// New namespace
var Swarmation = {};

Swarmation.Board = {
    canvas: $('#board'),
    
    getContext: function() { 
        return Swarmation.Board.canvas[0].getContext("2d"); 
    },
    
    drawGrid: function() {
        var context = Swarmation.Board.getContext();
        
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
    },

    drawPixel: function(px, py) {
        var offset = Swarmation.Board.canvas.offset();
        var x = Math.floor((px - offset.left - 2) / 10) * 10 + 1;
        var y = Math.floor((py - offset.top - 2) / 10) * 10 + 1;
        Swarmation.Board.getContext.fillRect(x, y, 9, 9);
        sendAction('newPixel', { x: x, y: y });     
    },

    clear: function() {
        Swarmation.Board.canvas[0].width = Swarmation.Board.canvas[0].width;
        Swarmation.Board.drawGrid();
    }
};

(function($, undefined) {
    // Bind events
    $('#board').mousedown(function(e) {
        Swarmation.Board.drawPixel(e.pageX, e.pageY);
    });

    $('#board').bind('newPixel', function(event, data) {
        context.fillRect(data.x, data.y, 9, 9);
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
    $(document).bind('keydown', 'space', function(e) {
        console.log('space');
        return false;
    });
    $(document).bind('keydown', 'esc', function(e) {
        Swarmation.Board.clear();
        return false;
    });

    // Run it
    Swarmation.Board.drawGrid();

})( jQuery );
