void setup() {
    size(961, 601);
    frameRate(10);
    smooth();
}

void draw() {
    background(0xffeeeeee);
    drawGrid();
    if (PLAYER && PLAYER.formation['showOutline']) {
		noStroke();
        fill(0xffD4E9FF);
        for (var i = 0; i < PLAYER.formation['points'].length; i++) {
            var x = (PLAYER.left + PLAYER.formation['points'][i][0]) * 10 + 1;
            var y = (PLAYER.top  + PLAYER.formation['points'][i][1]) * 10 + 1;
            rect(x, y, 9, 9);
        }
    }
    for (var id in PLAYERS) {
        drawPlayer(PLAYERS[id]);
    }
    if (PLAYER) {
        drawPlayer(PLAYER);
    }
}

void drawPlayer(player) {
    if (player.isSelf) {
        drawPixel(player.getX(), player.getY(), 0xff007FFF, 0xff89CFF0);
    } else {
        drawPixel(player.getX(), player.getY(), 0xff666666, 0xffcccccc);
    }
}

void drawPixel(x,y,border,bg) {
    strokeWeight(2);
    stroke(border);
    fill(bg);
    rect(x,y,9,9);
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


