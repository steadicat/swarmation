float bx = getX();
float by = getY();
int bs = 9;

function getX() {
	return floor(random(width)/10) * 10 + 1;
}

function getY() {
	return floor(random(height)/10) * 10 + 1;
}

void setup() {
	size(961, 601);
	smooth();
  frameRate(10);
}

void draw() {
  background(0xffeeeeee);
  drawGrid();  
  noStroke();
  fill(0xff000000);
	rect(bx,by,9,9);
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
	var x = floor(random(width)/10) * 10;
  var y = floor(random(height)/10) * 10;
  newPixel(x+1,y+1);
}

void newPixel(x,y) {

}

void keyPressed() {
  if (key == CODED) {
    if (keyCode == LEFT) {
			bx = bx - 10;
		} else if (keyCode == RIGHT) {
			bx = bx + 10;
		} else if (keyCode == UP) {
			by = by - 10;
		} else if (keyCode == DOWN) {
		  by = by + 10;	
		}
	}
}