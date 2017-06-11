var util = require('util');
var fs = require('fs');

function getPoints(diagram, y, x) {
  var points = [];
  for (var i in diagram) {
    for (var j = 0; j < diagram[i].length; j++) {
      if (diagram[i].charAt(j) == 'x') {
        if (x != j || y != i) points.push([j - x, i - y]);
      }
    }
  }
  return points;
}

function parseFormation(lines) {
  var formation = {};
  var signature = lines[0].replace(/^=+|=+$/g, '').trim();
  formation.name = signature.split('(')[0].trim();
  formation.difficulty = parseInt(signature.split('(')[1].replace(/^\(|\)$/g, '').trim(), 10);
  formation.diagram = lines.slice(1);
  return formation;
}

function parse(file) {
  var formations = {};
  var buffer = [];
  file.split('\n').forEach(function(line) {
    if (line.charAt(0) == '=') {
      if (buffer.length > 0) {
        var formation = parseFormation(buffer);
        formations[formation.name] = formation;
        buffer = [];
      }
    }
    buffer.push(line);
  });
  var formation = parseFormation(buffer);
  formations[formation.name] = formation;
  return formations;
}

var Formations = {};

Formations.getFormations = function() {
  var formations = parse(fs.readFileSync(__dirname + '/formations.txt', 'utf-8'));
  for (name in formations) {
    var formation = formations[name];
    formation.map = [];
    for (var i in formation.diagram) {
      for (var j = 0; j < formation.diagram[i].length; j++) {
        var c = formation.diagram[i].charAt(j);
        if (c == 'x') {
          formation.map[i] || (formation.map[i] = []);
          formation.map[i][j] = true;
          if (!formation.points) formation.points = getPoints(formation.diagram, i, j);
        }
      }
    }

    if (!formation.points) {
      // malformed formation?
      console.log('Formation ' + formation.name + ' is malformed!');
      continue;
    }

    formation.size = formation.points.length + 1;
    formations[name] = formation;
    delete formation.diagram;
  }
  return formations;
};

module.exports = Formations;
