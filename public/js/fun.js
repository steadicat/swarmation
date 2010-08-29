void setup() {
    size(961, 601);
    smooth();
    frameRate(10);
}

void draw() {
    background(0xffeeeeee);
    drawGrid();
    for (var id in PLAYERS) {
        drawPlayer(PLAYERS[id]);
    }
    if (PLAYER) {
        drawPlayer(PLAYER);
    }
}

void drawPlayer(player) {
    strokeWeight(2);
    if (player.isSelf) {
        stroke(0xff007FFF);
        fill(0xff89CFF0);
    } else {
        stroke(0xff666666);
        fill(0xffcccccc);
    }
    rect(player.getX(), player.getY(), 9, 9);
}

void drawGrid() {
    stroke(0xffdddddd);
    strokeWeight(1);
    for (var x = 0.5; x <= width; x += 10) {
        line(x, 0, x, height);
    }
    for (var y = 0.5; y <= height; y += 10) {
        line(0, y, width, y);
    }
}

void keyPressed() {
    if (key == CODED) {
        if (keyCode == LEFT) {
            PLAYER.move('left');
        } else if (keyCode == RIGHT) {
            PLAYER.move('right');
        } else if (keyCode == UP) {
            PLAYER.move('up');
        } else if (keyCode == DOWN) {
            PLAYER.move('down');
        }
    }

    if (key == 32) {
        PLAYER.usePower();
    }
}


