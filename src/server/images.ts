import {Canvas, Image} from 'canvas';
import * as fs from 'fs';

import * as Formations from '../formations.js';
import {Formation} from '../formations.js';

const PIXEL = new Image();
PIXEL.src = fs.readFileSync('public/images/pixel.png');
const PIXEL_SIZE = 15;
const PADDING = 15;

function getImage(formation: Formation, cb: (err: Error | null, buffer: Buffer) => void) {
  const maxHeight = formation.map.length;
  let maxWidth = 0;
  for (const row of formation.map) {
    maxWidth = Math.max(maxWidth, row.length);
  }
  const canvas = new Canvas(
    maxWidth * PIXEL_SIZE + 2 * PADDING,
    maxHeight * PIXEL_SIZE + 2 * PADDING
  );
  const ctx = canvas.getContext('2d');
  formation.map.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) ctx.drawImage(PIXEL, PADDING + x * PIXEL_SIZE, PADDING + y * PIXEL_SIZE);
    });
  });
  canvas.toBuffer(cb);
}

const formations = Formations.getFormations();
for (const formation of formations) {
  getImage(formation, (err: Error | null, buffer: Buffer) => {
    if (err) throw err;
    fs.writeFile(`public/formation/${formation.name}.png`, buffer, (err2) => {
      if (err2) console.log(err2);
    });
  });
}
