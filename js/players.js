var WIDTH = 96
var HEIGHT = 60
var DEAD_WIDTH = 12
var DEAD_HEIGHT = 60
var NAMES = ['Saber', 'Tooth', 'Moose', 'Lion', 'Peanut', 'Jelly', 'Thyme', 'Zombie', 'Cranberry']
var MOVEMENT_RATE = 140

var PLAYER
var PLAYERS = {}
var MAP = []

var Dom = require('./dom')
var Util = require('./util')
var Html = require('./html')

function displayMessage(text) {
  var message = Dom.ge('message')
  message.innerHTML = text
  message.setAttribute('style', 'display: block')
}

function scoreChange(delta) {
  Dom.ge('score').textContent = PLAYER.score
  Dom.ge('success').textContent = PLAYER.successRate()
  var board = Dom.ge('board')
  var popup = Html.div('.score.abs.center', (delta>0 ? '+' : '')+delta)
  Dom.addClass(popup, delta > 0 ? 'positive' : 'negative')
  popup.style.left =  PLAYER.getX() -200 + 'px'
  popup.style.top = PLAYER.getY() -50 + 'px'
  var el = popup.render()
  board.appendChild(el)
  setTimeout(function() {
    Dom.addClass(el, 'scale')
    setTimeout(function() {
      Dom.remove(el)
    }, 600)
  }, 10)
}

var Player = function Player(id, left, top, isSelf) {
  this.id = id

  this.el = Dom.ce('div')
  this.el.setAttribute('class', 'player')
  Dom.ge('board').appendChild(this.el)
  if (!left) {
    left = Math.floor(Math.random() * WIDTH)
    top = Math.floor(Math.random() * HEIGHT)
    while (!this.setPosition(left, top)) {
      left = Math.floor(Math.random() * WIDTH)
      top = Math.floor(Math.random() * HEIGHT)
    }
  } else {
    this.setPosition(left, top)
  }
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
    // cancel if in dead area
    if ((left < DEAD_WIDTH) && (top < DEAD_HEIGHT)) return false

    if (!MAP[this.left]) MAP[this.left] = []
    MAP[this.left][this.top] = null
    var first = (this.left === undefined)
    this.left = left
    this.top = top
    if (!MAP[left]) MAP[left] = []
    MAP[left][top] = this

    this.el.style.left = this.getX() + 'px'
    this.el.style.top =  this.getY() + 'px'

    if (this.welcome) this.positionWelcome()

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

  formationDeadline: function(success, gain, loss) {
    this.total++
    if (success) {
      Dom.addClass(this.el, 'active')
      var el = this.el
      setTimeout(function() {
        Dom.removeClass(el, 'active')
      }, 1000)
      this.score += gain
      this.succeeded++
      if (this.isSelf) scoreChange(+gain)
      Dom.removeClass(this.el, 'idle')
    } else {
      this.score = Math.max(0, this.score-loss)
      if (this.isSelf) scoreChange(-loss)
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
    Dom.ge('tooltip-name').textContent = this.name
    Dom.ge('tooltip-score').textContent = this.score
    Dom.ge('tooltip-success').textContent = this.successRate()
    Dom.removeClass(tooltip, 'off')
    tooltip.style.left = this.getX() - tooltip.offsetWidth/2 + 17 + 'px'
    tooltip.style.top = this.getY() - tooltip.offsetHeight - 5 + 'px'
  },

  showWelcome: function() {
    var welcome = Dom.ge('welcome')
    this.welcome = welcome
    Dom.removeClass(welcome, 'off')
    this.positionWelcome(true)
  },

  positionWelcome: function(first) {
    if (!first) {
      Dom.addClass(Dom.ge('welcome-1'), 'off')
      Dom.removeClass(Dom.ge('welcome-2'), 'off')
      this.welcomeCountdown--
      if (this.welcomeCountdown == 0) {
        this.welcome.style.opacity = 0
        var self = this
        setTimeout(function() {
          delete self.welcomeCountdown
          delete self.welcome
        }, 1000)
      }
    } else {
      this.welcomeCountdown = 20
      welcome.style.opacity = 0
      setTimeout(function() {
        Dom.addClass(welcome, 'fade')
        welcome.style.opacity = 1
      }, 100)
    }
    this.welcome.style.left = this.getX() - this.welcome.offsetWidth/2 + 17 + 'px'
    this.welcome.style.top = this.getY() - this.welcome.offsetHeight -5 + 'px'
  },

  hideTooltip: function() {
    Dom.addClass(Dom.ge('tooltip'), 'off')
  },
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
    PLAYER.showWelcome()
  }
})

socket.on('info', function(data) {
  if (PLAYER && (data.id == PLAYER.id)) {
    PLAYER.getInfo(data)
    if (data.score) Dom.ge('score').textContent = data.score
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
})

socket.on('disconnected', function(data) {
  var p = PLAYERS[data.id]
  if (!p) return
  delete MAP[p.left][p.top]
  Dom.remove(PLAYERS[data.id].el)
  delete PLAYERS[data.id]
})

function contains(el, list) {
  return list.indexOf(el) >= 0
}

socket.on('formation', function(data) {
  if ((!PLAYER) || (!PLAYER.id)) return
  PLAYER.formationDeadline(contains(PLAYER.id, data.ids), data.gain, data.loss)
  Util.each(PLAYERS, function(id, player) {
    player.formationDeadline(contains(id, data.ids), data.gain, data.loss)
  })
})

var time
var formationInterval

socket.on('nextFormation', function(data) {
  Dom.ge('formation-name').textContent = data.formation
  Dom.ge('formation-image').style.backgroundImage = 'url(/images/formations/'+data.formation+'.png)'

  time = data.time
  Dom.ge('countdown').textContent = time

  if (formationInterval) clearInterval(formationInterval)
  formationInterval = setInterval(function() {
    time--
    Dom.ge('countdown').textContent = time
    if (time == 0) clearInterval(formationInterval)
  }, 1000)
})

var RESTARTING = false

socket.on('restart', function(data) {
  RESTARTING = true
  socket.disconnect()
  displayMessage('Swarmation needs to restart for an update.<br/>Please reload the page.')
})

socket.on('kick', function(data) {
  RESTARTING = true
  socket.disconnect()
  displayMessage('You have been disconnected for being idle too long.<br/>Reload the page to resume playing.')
})

socket.on('connect', function() {
  if (PLAYER) PLAYER.sendInfo(true)
  for (var id in PLAYERS) Dom.remove(PLAYERS[id].el)
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

var Players = {}

Players.login = function(userId, token, name) {
  if (!PLAYER) return
  Dom.addClass(Dom.ge('login'), 'off')
  Dom.ge('username').textContent = name
  Dom.removeClass(Dom.ge('username-box'), 'off')
  socket.emit('login', { token: token, userId: userId, name: name })
  PLAYER.name = name
  PLAYER.sendInfo(true)
}

module.exports = Players
