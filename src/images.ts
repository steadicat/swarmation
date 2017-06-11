import * as Canvas from 'canvas';
import {Image} from 'canvas';
import * as fs from 'fs';
import * as Formations from './formations';

const images = {};

const PIXEL = new Image();
PIXEL.src = fs.readFileSync(__dirname + '/../public/images/pixel.png');
const PIXEL_SIZE = 15;
const PADDING = 15;

function getImage(formation, cb) {
  const maxHeight = formation.map.length;
  let maxWidth = 0;
  formation.map.forEach(row => {
    maxWidth = Math.max(maxWidth, row.length);
  });
  const canvas = new Canvas(maxWidth * PIXEL_SIZE + 2 * PADDING, maxHeight * PIXEL_SIZE + 2 * PADDING);
  const ctx = canvas.getContext('2d');
  formation.map.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) ctx.drawImage(PIXEL, PADDING + x * PIXEL_SIZE, PADDING + y * PIXEL_SIZE);
    });
  });
  canvas.toBuffer(cb);
}

const formations = Formations.getFormations();
Object.keys(formations).forEach(name => {
  getImage(formations[name], (err, buffer) => {
    if (err) throw err;
    fs.writeFile('public/formation/' + name + '.png', buffer, err2 => {
      if (err2) console.log(err2);
    });
  });
});
