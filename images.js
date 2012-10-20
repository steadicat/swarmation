var fs = require('fs')
var Canvas = require('canvas')
var Image = Canvas.Image

var images = {}

var PIXEL = new Image
fs.readFile('public/images/pixel.png', function(err, file) {
  PIXEL.src = file
})
var PIXEL_SIZE = 15
var PADDING = 15

images.getImage = function(formation, cb) {
  var maxHeight = formation.map.length
  var maxWidth = 0
  formation.map.forEach(function(row) {
    maxWidth = Math.max(maxWidth, row.length)
  })
  var canvas = new Canvas(maxWidth*PIXEL_SIZE + 2*PADDING, maxHeight*PIXEL_SIZE + 2*PADDING)
  var ctx = canvas.getContext('2d')
  formation.map.forEach(function(row, y) {
    row.forEach(function(cell, x) {
      if (cell) ctx.drawImage(PIXEL, PADDING + x*PIXEL_SIZE, PADDING + y*PIXEL_SIZE)
    })
  })
  canvas.toBuffer(cb)
}

module.exports = images
