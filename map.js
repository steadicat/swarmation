var util = require('./js/util')

var Map = {}

var MAP = {}

Map.set = function(x, y, v) {
  if (!MAP[x]) MAP[x] = {}
  MAP[x][y] = v
}

Map.get = function(x, y) {
  if (MAP[x]) return MAP[x][y]
}

Map.unset = function(x, y, v) {
  if (MAP[x]) delete MAP[x][y]
}

Map.move = function(x1, y1, x2, y2, v) {
  if ((x1 != x2) || (y1 != y2)) {
    Map.unset(x1, y1, v)
    Map.set(x2, y2, v)
  }
}

Map.exists = function(x, y) {
  if (!MAP[x]) return false
  return MAP[x][y] !== undefined
}

Map.checkFormationAtOrigin = function(formation, x, y) {
  var players = []
  util.each(formation.points[0], function(point) {
    var player = Map.get(x+point[0], y+point[1])
    if (!player) {
      players = []
      return false
    }
    players.push(player)
  })
  if (players.length > 0) players.push(Map.get(x, y))
  return players
}

Map.checkFormation = function(formation, players) {
  var winners = {}
  util.each(players, function(id, player) {
    var f = Map.checkFormationAtOrigin(formation, player.left, player.top)
    util.each(f, function(p) {
      winners[p.id] = p
    })
  })
  return winners
}

module.exports = Map
