// New namespace
var Swarmation = {};

// The game board object
// Follows the singleton pattern
Swarmation.Board = {
    canvas: $('#board'),
    
    // Get the canvas context for drawing
    getContext: function() { 
        return Swarmation.Board.canvas[0].getContext("2d"); 
    },

    getCoords: function(px, py) {
        var offset = Swarmation.Board.canvas.offset();
        var x = Math.floor((px - offset.left - 2) / 10) * 10 + 1;
        var y = Math.floor((py - offset.top - 2) / 10) * 10 + 1;
        return { x: x, y: y };
    },
    
    // Draw the grid
    drawGrid: function() {
        var board = Swarmation.Board.canvas[0];
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

    // Draw a pixel and broadcasts location
    drawPixel: function(x, y) {
        //var coords = Swarmation.Board.getCoords(px, py);
        Swarmation.Board.getContext().fillRect(x, y, 9, 9);
        sendAction('newPixel', { x: x, y: y });     
    },

    // Draw a pixel at the given coordinates DOESN'T BROADCAST
    newPixel: function(x, y) {
        Swarmation.Board.getContext().fillRect(x, y, 9, 9);
    },

    // Erase a pixel at the given coordinates
    clearPixel: function(x, y) {
        var context = Swarmation.Board.getContext();
        context.strokeStyle = "fff";
        context.clearRect(x, y, 9, 9);
    },

    // Erase all pixels from the board
    clear: function() {
        Swarmation.Board.canvas[0].width = Swarmation.Board.canvas[0].width;
        Swarmation.Board.drawGrid();
    }
};


// The player object
Swarmation.Player = function(startx, starty) {
    var coords = Swarmation.Board.getCoords(startx, starty);
    this.setLocation(coords.x, coords.y);
    this.draw();
};

Swarmation.Player.prototype = {
    setLocation: function(x, y) {
        this._x = x;
        this._y = y;
    },
    
    getLocation: function() {
        return { x: _x, y: _y };
    },
    
    draw: function() {
        Swarmation.Board.drawPixel(this._x, this._y);
    },
    
    move: function(direction) {
        Swarmation.Board.clearPixel(this._x, this._y);
        sendAction('clearPixel', { x: this._x, y: this._y });

        switch (direction) {
        case 'left':
            this._x -= 10;
            break;
        case 'up':
            this._y -= 10;           
            break;
        case 'right':
            this._x += 10;           
            break;
        case 'down':
            this._y += 10;           
            break;
        }
        Swarmation.Board.drawPixel(this._x, this._y);
    },
    
    useCurrentPower: function() {
        console.log('Power!');
    },
    
    checkFormation: function() {
        //Might not use this
    }
};

(function($, undefined) {
    var player;
    
    // Bind events
    $('#board').mousedown(function(e) {
        if (player === undefined) {
            player = new Swarmation.Player(e.pageX, e.pageY);
        } else {
            console.log('Already instantiated');
        }
    });

    $('#board').bind('newPixel', function(event, data) {
        Swarmation.Board.newPixel(data.x, data.y);
    });
    $('#board').bind('clearPixel', function(event, data) {
        Swarmation.Board.clearPixel(data.x, data.y);
    });

    $(document).bind('keydown', 'left', function(e) {
        if (player !== undefined) {
            player.move('left');
        }
        return false;
    });
    $(document).bind('keydown', 'up', function(e) {
        if (player !== undefined) {
            player.move('up');
        }
        return false;
    });
    $(document).bind('keydown', 'right', function(e) {
        if (player !== undefined) {
            player.move('right');
        }
        return false;
    });
    $(document).bind('keydown', 'down', function(e) {
        if (player !== undefined) {
            player.move('down');
        }
        return false;
    });
    $(document).bind('keydown', 'space', function(e) {
        if (player !== undefined) {
            player.useCurrentPower();
        }
        return false;
    });
    $(document).bind('keydown', 'esc', function(e) {
        Swarmation.Board.clear();
        return false;
    });

    // Run it
    Swarmation.Board.drawGrid();

})( jQuery );
