// compile formations

var sys = require('sys')
var Formations = require('./formations').Formations

function getPoints(diagram, y, x) {
  var points = []
  for (var i in diagram) {
    for (var j=0; j < diagram[i].length; j++) {
      if ((diagram[i].charAt(j) == 'o') || (diagram[i].charAt(j) == 'x')) {
        if ((x!=j) || (y!=i)) points.push([j-x, i-y])
      }
    }
  }
  return points
}

var Forms = {}

Forms.getFormations = function() {
  var formations = {}
  for (name in Formations) {
    var diagram = Formations[name].split('\n')
    var formation = {}
    formation.name = name
    formation.difficulty = parseInt(diagram[0], 10)
    formation.map = []
    for (var i in diagram) {
      for (var j=0; j < diagram[i].length; j++) {
        var c = diagram[i].charAt(j)
        if ((c == 'o') || (c == 'x')) {
          formation.map[i] || (formation.map[i] = [])
          formation.map[i][j] = true
          if (!formation.points) formation.points = getPoints(diagram, i, j)
        }
      }
    }

    if (!formation.points) {
      // malformed formation?
      sys.log('Formation ' + formation.name + ' is malformed!')
      continue
    }

    formation.size = formation.points.length+1
    formations[name] = formation
    formation.map = formation.map.slice(1)
  }
  return formations
}

module.exports = Forms
