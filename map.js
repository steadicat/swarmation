var util = require('./js/util');

var Map = {};

var MAP = {};

Map.set = function(x, y, v) {
  if (!MAP[x]) MAP[x] = {};
  MAP[x][y] = v;
};

Map.get = function(x, y) {
  if (MAP[x]) return MAP[x][y];
};

Map.unset = function(x, y, v) {
  if (MAP[x]) delete MAP[x][y];
};

Map.move = function(x1, y1, x2, y2, v) {
  if (x1 != x2 || y1 != y2) {
    Map.unset(x1, y1, v);
    Map.set(x2, y2, v);
  }
};

Map.exists = function(x, y) {
  if (!MAP[x]) return false;
  return MAP[x][y] !== undefined;
};

Map.checkFormationAtOrigin = function(formation, x, y) {
  var players = [];
  var success = formation.points.every(function(point) {
    var player = Map.get(x + point[0], y + point[1]);
    players.push(player);
    return !!player;
  });
  if (!success) return [];
  players.push(Map.get(x, y));
  return players;
};

Map.checkFormation = function(formation, players) {
  var winners = {};
  util.each(players, function(id, player) {
    var f = Map.checkFormationAtOrigin(formation, player.left, player.top);
    f.forEach(function(p) {
      // work around dirty map bug
      if (!p) return;
      winners[p.id] = p;
    });
  });
  return winners;
};

module.exports = Map;
