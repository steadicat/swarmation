// Global vars
Player p = null;

void setup() {
    size(961, 601);
    background(0xffeeeeee);
    smooth();
    drawGrid();
    placePixel();
}

void draw() {
}

void drawGrid() {
	stroke(0xffdddddd);
	for (var x = 0.5; x <= width; x += 10) {
	    line(x, 0, x, height);
	}
	for (var y = 0.5; y <= height; y += 10) {
	    line(0, y, width, y);
	}
}

void placePixel() {
    var x = floor(random(width)  / 10) * 10;
    var y = floor(random(height) / 10) * 10;
    newPixel(x + 1, y + 1);
}

void newPixel(x,y) {
    noStroke();
    fill(0xff000000);
    rect(x, y, 9, 9);
}

void keyPressed() {
    if (key == CODED) {
        if (keyCode == LEFT) {
            p.move('left');
        } else if (keyCode == UP) {
            p.move('up');
        } else if (keyCode == RIGHT) {
			p.move('right');
		} else if (keyCode == DOWN) {
			p.move('down')
		}
    }
}

void mousePressed() {
	console.log('mouse pressed');
	if (!p) {
		p = new Player(mouseX, mouseY)
		p.draw();
	}
}

class Player {
	int xpos, ypos;
	
	Player(x, y) {
		xpos = x;
		ypos = y;
	}
	
	move(direction) {
		console.log('move ' + direction)
	}
}