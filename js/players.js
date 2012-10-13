var WIDTH = 96
var HEIGHT = 60
var PLAYER
var PLAYERS = {}
var MAP = []
var FORMATION
var NAMES = ['Saber', 'Tooth', 'Moose', 'Lion', 'Peanut', 'Jelly', 'Thyme', 'Zombie', 'Cranberry']

var MAX_POINTS = 26
var QUORUM = 2
var MARGIN = 1000
var MOVEMENT_RATE = 140

var Dom = require('./dom')
var Util = require('./util')
var Forms = require('./forms')
var Page = require('./page')

var Formations = Forms.getFormations()

var Player = function Player(id, left, top, isSelf) {
  this.id = id

  if (!left) {
    left = Math.floor(Math.random() * WIDTH)
    top = Math.floor(Math.random() * HEIGHT)
    while (Player.atPosition(left, top)) {
      left = Math.floor(Math.random() * WIDTH)
      top = Math.floor(Math.random() * HEIGHT)
    }
  }
  this.el = Dom.ce('div')
  this.el.setAttribute('class', 'player')
  Dom.ge('board').appendChild(this.el)
  this.setPosition(left, top)
  this.isSelf = isSelf
  this.name = NAMES[Math.floor(Math.random()*NAMES.length)]
  this.score = 0
  this.succeeded = 0
  this.total = 0
  this.completed = 0

  this.moveIntervals = {}

  if (isSelf) {
    Dom.addClass(this.el, 'self')
    this.sendInfo()
  }
  var p = this
  Dom.listen(this.el, 'mouseover', function() {
    p.showTooltip()
  })
  Dom.listen(this.el, 'mouseout', function() {
    p.hideTooltip()
  })
}

Player.atPixel = function(x, y) {
  return Player.atPosition(Player.getLeft(x), Player.getTop(y))
}

Player.atPosition = function(left, top) {
  if (!MAP[left]) MAP[left] = []
  return MAP[left][top]
}

Player.getLeft = function(x) { return Math.floor(x/10) }
Player.getTop = function(y) { return Math.floor(y/10) }

Player.directions = {
  left: function(left, top) { return [left-1, top] },
  right: function(left, top) { return [left+1, top] },
  up: function(left, top) { return [left, top-1] },
  down: function(left, top) { return [left, top+1] },
}

Player.prototype = {
  getX: function() { return this.left * 10 + 1 },
  getY: function() { return this.top * 10 + 1 },

  setPosition: function(left, top) {
    // cancel in case of collisions
    if (Player.atPosition(left, top)) return false
    // cancel if out of bounds
    if ((left < 0) || (left >= WIDTH)) return false
    if ((top < 0) || (top >= HEIGHT)) return false

    if (!MAP[this.left]) MAP[this.left] = []
    MAP[this.left][this.top] = null
    var first = (this.left === undefined)
    this.left = left
    this.top = top
    if (!MAP[left]) MAP[left] = []
    MAP[left][top] = this

    if (first) {
      this.el.style.left = this.getX() + 'px'
      this.el.style.top =  this.getY() + 'px'
    } else {
      this.el.style.left = this.getX() + 'px'
      this.el.style.top = this.getY() + 'px'
    }
    return true
  },

  move: function(direction) {
    var newp = Player.directions[direction](this.left, this.top)
    var changed = this.setPosition(newp[0], newp[1])
    if (changed && this.isSelf) {
      this.sendInfo()
      Dom.removeClass(this.el, 'idle')
    }
  },

  startMove: function(direction) {
    var p = this
    if (p.moveIntervals[direction]) return
    p.move(direction)
    this.moveIntervals[direction] = setInterval(function() {
      p.move(direction)
    }, MOVEMENT_RATE)
  },

  stopMove: function(direction) {
    clearInterval(this.moveIntervals[direction])
    this.moveIntervals[direction] = null
  },

  startFlash: function() {
    Dom.addClass(this.el, 'flash')
    if (this.isSelf) socket.emit('flash', {})
  },

  stopFlash: function() {
    Dom.removeClass(this.el, 'flash')
    if (this.isSelf) socket.emit('flash', { stop: true })
  },

  checkFormationPoints: function(points) {
    var others = []
    for (var i in points) {
      var dx = points[i][0]
      var dy = points[i][1]
      var other = Player.atPosition(this.left+dx, this.top+dy)
      if (!other) return
      others.push(other.id)
    }
    return others
  },

  checkFormation: function(formation) {
    if (!this.id) return
    for (var i in formation.points) {
      var others = this.checkFormationPoints(formation.points[i])
      if (!others) continue
      this.formationReported(formation.name)
      for (var id in others) if (PLAYERS[others[id]]) PLAYERS[others[id]].formationReported(formation.name)
      socket.emit('formation', { formation: formation.name, ids: others })
    }
  },

  formationReported: function(name) {
    this.completed++
  },

  formationDeadline: function() {
    this.total++
    if (this.completed >= QUORUM) {
      Dom.addClass(this.el, 'active')
      var el = this.el
      setTimeout(function() {
        Dom.removeClass(el, 'active')
      }, 1000)
      this.score += FORMATION.difficulty
      this.succeeded++
      if (this.isSelf) {
        Page.displayNotice('You completed '+FORMATION.name+'. You gain '+FORMATION.difficulty+' points!')
      }
      Dom.removeClass(this.el, 'idle')
    } else {
      var delta = Math.round((MAX_POINTS-FORMATION.difficulty)/2)
      this.score = Math.max(0, this.score-delta)
      if (this.isSelf) {
        Page.displayNotice('You did not make '+FORMATION.name+'! Lose '+delta+' points.')
      }
    }
    this.completed = 0
    if (this.isSelf) {
      // save occasionally
      //if (Math.random() < 0.3) this.save()
      Dom.ge('score').textContent = this.score
      Dom.ge('success').textContent = this.successRate()
    }
  },

  successRate: function() {
    if (this.total == 0) return 100
    return Math.round(1000.0*this.succeeded/this.total)/10
  },

  sendInfo: function(full) {

    if (full) {
      socket.emit('info', {
        left: this.left,
        top: this.top,
        name: this.name,
        score: this.score,
        total: this.total,
        succeeded: this.succeeded
      })
    } else {
      Util.rateLimit(this, MOVEMENT_RATE/2, function() {
        socket.emit('info', { left: this.left, top: this.top })
      })
    }
  },

  getInfo: function(info) {
    if (info.left) this.setPosition(info.left, info.top)
    if (info.name) this.name = info.name
    if (info.score) this.score = info.score
    if (info.total) this.total = info.total
    if (info.succeeded) this.succeeded = info.succeeded
  },

  showTooltip: function() {
    var tooltip = Dom.ge('tooltip')
    var board = Dom.ge('board')
    Dom.removeClass(tooltip, 'off')
    tooltip.style.left = this.getX() + board.offsetLeft - 6 + 'px'
    tooltip.style.top = this.getY() + board.offsetTop + 25 + 'px'
    Dom.ge('#tooltip-name').textContent = this.name
    Dom.ge('#tooltip-score').textContent = this.score
    Dom.ge('#tooltip-success').textContent = this.successRate()
  },

  hideTooltip: function() {
    Dom.addClass(Dom.ge('tooltip'), 'off')
  }
}

// sockets

var io = require('./socketio')
var socket = io.connect('')

function loadPlayer(data) {
  if (!PLAYERS[data.id]) {
    PLAYERS[data.id] = new Player(data.id, data.left, data.top)
  }
  if (!data.name) Dom.removeClass(PLAYERS[data.id].el, 'idle')
  PLAYERS[data.id].getInfo(data)
}

socket.on('welcome', function(data) {
  for (id in data.players) loadPlayer(data.players[id])
  if (PLAYER) {
    PLAYER.id = data.id
  } else {
    PLAYER = new Player(data.id, null, null, true)
  }
})

socket.on('info', function(data) {
  if (PLAYER && (data.id == PLAYER.id)) {
    PLAYER.getInfo(data)
    PLAYER.rev = data._rev
  } else {
    loadPlayer(data)
  }
})

socket.on('flash', function(data) {
  if (PLAYERS[data.id]) {
    if (data.stop) {
      PLAYERS[data.id].stopFlash()
    } else {
      PLAYERS[data.id].startFlash()
    }
  }
})

socket.on('idle', function(data) {
  if (PLAYERS[data.id]) Dom.addClass(PLAYERS[data.id].el, 'idle')
  if (PLAYER && (data.id == PLAYER.id)) Dom.addClass(PLAYER.el, 'idle')
})

socket.on('connected', function(data) {
  Util.log(data)
})

socket.on('disconnected', function(data) {
  var p = PLAYERS[data.id]
  if (!p) return
  delete MAP[p.left][p.top]
  PLAYERS[data.id].el.remove()
  delete PLAYERS[data.id]
})

function contains(el, list) {
  for (var i=0; i<list.length; i++) {
    if (list[i] == el) return true
  }
  return false
}

socket.on('formation', function(data) {
  if ((!PLAYER) || (!PLAYER.id)) return
  if (contains(PLAYER.id, data.ids) >= 0) PLAYER.formationReported(data.formation)
  if (PLAYERS[data.id]) PLAYERS[data.id].formationReported(data.formation)
  for (var j = 0; j < data.ids.length; j++) {
    if (PLAYERS[data.ids[j]]) PLAYERS[data.ids[j]].formationReported(data.formation)
  }
})

var time
var formationInterval

socket.on('nextFormation', function(data) {
  FORMATION = Formations[data.formation]
  var formation = Dom.ge('formation')
  formation.textContent = data.formation
  formation.style.background =
    'url(http://djdtqy87hg7ce.cloudfront.net/images/formations/'+data.formation+'.png) no-repeat center top'

  time = data.time
  Dom.ge('countdown').textContent = time

  if (formationInterval) clearInterval(formationInterval)
  formationInterval = setInterval(function() {
    time--
    Dom.ge('countdown').textContent = time
  }, 1000)

  setTimeout(function() {
    if (FORMATION) {
      PLAYER.checkFormation(FORMATION)
      setTimeout(function() {
        PLAYER.formationDeadline()
        for (var id in PLAYERS) PLAYERS[id].formationDeadline()
        clearInterval(formationInterval)
        Dom.ge('countdown').textContent = '0'
      }, MARGIN)
    }
  }, data.time*1000 - MARGIN)
})

var RESTARTING = false

socket.on('restart', function(data) {
  RESTARTING = true
  socket.disconnect()
  Page.displayMessage('Swarmation needs to restart for an update.<br/>Please reload the page.')
})

socket.on('kick', function(data) {
  RESTARTING = true
  socket.disconnect()
  Page.displayMessage('You have been disconnected for being idle too long.<br/>Reload the page to resume playing.')
})

socket.on('connect', function() {
  if (PLAYER) PLAYER.sendInfo(true)
  for (var id in PLAYERS) PLAYERS[id].el.remove()
  PLAYERS = {}
  MAP = []
})

socket.on('disconnect', function() {
  if (RESTARTING) return
  var interval
  function connect() {
    if (socket.connected) {
      clearInterval(interval)
    } else {
      socket = io.connect()
    }
  }
  connect()
  interval = setInterval(connect, 1000)
})



var MOVEMENTS = {
  38: 'up',
  40: 'down',
  37: 'left',
  39: 'right'
}

function stop(event) {
  event.preventDefault()
  event.stopPropagation()
}

Dom.listen(document, 'keydown', function(event) {
  if (!PLAYER) return

  if (MOVEMENTS[event.keyCode]) {
    PLAYER.startMove(MOVEMENTS[event.keyCode])
    stop(event)
  } else if (event.keyCode == 32) { // space
    PLAYER.startFlash()
    stop(event)
  }
})

Dom.listen(document, 'keyup', function(event) {
  if (!PLAYER) return

  if (MOVEMENTS[event.keyCode]) {
    PLAYER.stopMove(MOVEMENTS[event.keyCode])
    stop(event)
  } else if (event.keyCode == 32) { // space
    PLAYER.stopFlash()
    stop(event)
  }
})
