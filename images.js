var fs = require('fs');
var Canvas = require('canvas');
var Formations = require('./formations');
var Image = Canvas.Image;

var images = {};

var PIXEL = new Image();
PIXEL.src = fs.readFileSync(__dirname + '/public/images/pixel.png');
var PIXEL_SIZE = 15;
var PADDING = 15;

function getImage(formation, cb) {
  var maxHeight = formation.map.length;
  var maxWidth = 0;
  formation.map.forEach(function(row) {
    maxWidth = Math.max(maxWidth, row.length);
  });
  var canvas = new Canvas(maxWidth * PIXEL_SIZE + 2 * PADDING, maxHeight * PIXEL_SIZE + 2 * PADDING);
  var ctx = canvas.getContext('2d');
  formation.map.forEach(function(row, y) {
    row.forEach(function(cell, x) {
      if (cell) ctx.drawImage(PIXEL, PADDING + x * PIXEL_SIZE, PADDING + y * PIXEL_SIZE);
    });
  });
  canvas.toBuffer(cb);
}

var formations = Formations.getFormations();
Object.keys(formations).forEach(function(name) {
  getImage(formations[name], function(err, buffer) {
    if (err) throw err;
    fs.writeFile('public/formation/' + name + '.png', buffer, function(err) {
      if (err) console.log(err);
    });
  });
});
