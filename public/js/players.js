var WIDTH = 96
var HEIGHT = 60
var PLAYER
var PLAYERS = {}
var MAP = []
var FORMATION
var Player
var sendAction
var NAMES = ['Saber', 'Tooth', 'Moose', 'Lion', 'Peanut', 'Jelly', 'Thyme', 'Zombie', 'Cranberry']

var MAX_POINTS = 26
var QUORUM = 2
var MARGIN = 1000
var MOVEMENT_RATE = 140

var DEBUG = true

function log(m) {
  try {
    if (DEBUG) console.log(m)
  } catch (e) {}
}

(function($, undefined) {

  function rateLimit(target, rate, f) {
    if (target.timeout) return
    target.timeout = setTimeout(function() {
      f.call(target)
      target.timeout = null
    }, rate)
  }

  Formations = compileFormations(Formations)

  Player = function Player(id, left, top, isSelf) {
    this.id = id

    if (!left) {
      left = Math.floor(Math.random() * WIDTH)
      top = Math.floor(Math.random() * HEIGHT)
      while (Player.atPosition(left, top)) {
        left = Math.floor(Math.random() * WIDTH)
        top = Math.floor(Math.random() * HEIGHT)
      }
    }
    this.el = $('<div class="player"></div>').appendTo('#board')
    this.setPosition(left, top)
    this.isSelf = isSelf
    this.name = NAMES[Math.floor(Math.random()*NAMES.length)]
    this.score = 0
    this.succeeded = 0
    this.total = 0
    this.completed = 0

    this.moveIntervals = {}

    if (isSelf) {
      this.el.addClass('self')
      this.load()
      this.sendInfo()
    }
    var p = this
    this.el.hover(function() {
      p.showTooltip()
    }, function() {
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
        this.el.css({ left: this.getX(), top: this.getY() })
      } else {
        this.el.stop().animate({ left: this.getX(), top: this.getY() }, MOVEMENT_RATE)
      }
      return true
    },

    move: function(direction) {
      var newp = Player.directions[direction](this.left, this.top)
      var changed = this.setPosition(newp[0], newp[1])
      if (changed && this.isSelf) {
        this.sendInfo()
        this.el.removeClass('idle')
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
      this.el.addClass('flash')
      if (this.isSelf) sendAction('flash', {})
    },

    stopFlash: function() {
      this.el.removeClass('flash')
      if (this.isSelf) sendAction('flash', { stop: true })
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
        sendAction('formation', { formation: formation.name, ids: others })
      }
    },

    formationReported: function(name) {
        this.completed++
    },

    formationDeadline: function() {
      this.total++
      if (this.completed >= QUORUM) {
        this.el.addClass('active')
        var el = this.el
        setTimeout(function() {
          el.removeClass('active')
        }, 1000)
        this.score += FORMATION.difficulty
        this.succeeded++
        if (this.isSelf) {
          displayNotice('You completed '+FORMATION.name+'. You gain '+FORMATION.difficulty+' points!')
        }
        this.el.removeClass('idle')
      } else {
        var delta = Math.round((MAX_POINTS-FORMATION.difficulty)/2)
        this.score = Math.max(0, this.score-delta)
        if (this.isSelf) {
          displayNotice('You did not make '+FORMATION.name+'! Lose '+delta+' points.')
        }
      }
      this.completed = 0
      if (this.isSelf) {
        // save occasionally
        if (Math.random() < 0.3) this.save()
        $('#score .score').text(this.score)
        $('#success .success').text(this.successRate())
      }
    },

    successRate: function() {
        if (this.total == 0) return 100
        return Math.round(1000.0*this.succeeded/this.total)/10
    },

    sendInfo: function(full) {

      if (full) {
        sendAction('info', {
          left: this.left,
          top: this.top,
          name: this.name,
          score: this.score,
          total: this.total,
          succeeded: this.succeeded
        })
      } else {
        rateLimit(this, MOVEMENT_RATE/2, function() {
          sendAction('info', { left: this.left, top: this.top })
        })
      }
    },

    load: function() {
      sendAction('load', { player: $.cookie('player') })
    },

    save: function() {
      sendAction('save', {
        name: this.name,
        score: this.score,
        total: this.total,
        succeeded: this.succeeded,
        _id: $.cookie('player'),
        _rev: this.rev
      })
    },

    getInfo: function(info) {
      if (info.left) this.setPosition(info.left, info.top)
      if (info.name) this.name = info.name
      if (info.score) this.score = info.score
      if (info.total) this.total = info.total
      if (info.succeeded) this.succeeded = info.succeeded
    },

    showTooltip: function() {
      $('#tooltip')
        .show()
        .css('left', this.getX()+$('#board').offset().left-6)
        .css('top', this.getY()+$('#board').offset().top+25)
        .find('.name').text(this.name).end()
        .find('.score').text(this.score).end()
        .find('.success').text(this.successRate())
    },

    hideTooltip: function() {
      $('#tooltip').hide()
    }
  }

  var board = $('#board')

  function loadPlayer(data) {
    if (!PLAYERS[data.id]) {
      PLAYERS[data.id] = new Player(data.id, data.left, data.top)
    }
    if (!data.name) PLAYERS[data.id].el.removeClass('idle')
    PLAYERS[data.id].getInfo(data)
  }

  board.bind('welcome', function(event, data) {
    for (id in data.players) loadPlayer(data.players[id])
    if (PLAYER) {
        PLAYER.id = data.id
    } else {
        PLAYER = new Player(data.id, null, null, true)
    }
  })

  board.bind('info', function(event, data) {
    if (PLAYER && (data.id == PLAYER.id)) {
      PLAYER.getInfo(data)
      PLAYER.rev = data._rev
    } else {
      loadPlayer(data)
    }
  })

  board.bind('flash', function(event, data) {
    if (PLAYERS[data.id]) {
      if (data.stop) {
        PLAYERS[data.id].stopFlash()
      } else {
        PLAYERS[data.id].startFlash()
      }
    }
  })

  board.bind('idle', function(event, data) {
    if (PLAYERS[data.id]) PLAYERS[data.id].el.addClass('idle')
    if (PLAYER && (data.id == PLAYER.id)) PLAYER.el.addClass('idle')
  })

  board.bind('saved', function(event, data) {
    $.cookie('player', data.player, { expires: 3650 })
    PLAYER.rev = data.rev
  })

  board.bind('connected', function(event, data) {
  })

  board.bind('disconnected', function(event, data) {
    var p = PLAYERS[data.id]
    if (!p) return
    delete MAP[p.left][p.top]
    PLAYERS[data.id].el.remove()
    delete PLAYERS[data.id]
  })

  board.bind('formation', function(event, data) {
    if ((!PLAYER) || (!PLAYER.id)) return
    if ($.inArray(PLAYER.id, data.ids) >= 0) PLAYER.formationReported(data.formation)
    if (PLAYERS[data.id]) PLAYERS[data.id].formationReported(data.formation)
    for (var j = 0; j < data.ids.length; j++) {
      if (PLAYERS[data.ids[j]]) PLAYERS[data.ids[j]].formationReported(data.formation)
    }
  })

  var time
  var formationInterval

  board.bind('nextFormation', function(event, data) {
    FORMATION = Formations[data.formation]
    $('#formation')
      .css('background', 'url(http://djdtqy87hg7ce.cloudfront.net/images/formations/'+data.formation+'.png) no-repeat center top')
      .text(data.formation).end()

    time = data.time
    $('#countdown').text(time)

    if (formationInterval) clearInterval(formationInterval)
    formationInterval = setInterval(function() {
      time--
      $('#countdown').text(time)
    }, 1000)

    setTimeout(function() {
      if (FORMATION) {
        PLAYER.checkFormation(FORMATION)
        setTimeout(function() {
          PLAYER.formationDeadline()
          for (var id in PLAYERS) PLAYERS[id].formationDeadline()
          clearInterval(formationInterval)
          $('#countdown').text('0')
        }, MARGIN)
      }
    }, data.time*1000 - MARGIN)
  })

  var RESTARTING = false

  board.bind('restart', function(event, data) {
    RESTARTING = true
    socket.disconnect()
    displayMessage('Swarmation needs to restart for an update.<br/>Please reload the page.')
  })

  board.bind('kick', function(event, data) {
    RESTARTING = true
    socket.disconnect()
    displayMessage('You have been disconnected for being idle too long.<br/>Reload the page to resume playing.')
  })

  // sockets

  //io.setPath('/io/')
  var socket = io.connect('')

  socket.on('message', function(data) {
    log([data.id, data.type, data.left, data.top, data.score, data.succeeded, data.formation, data])
    board.trigger(data.type, data)
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
        socket.connect()
      }
    }
    connect()
    interval = setInterval(connect, 1000)
  })

  sendAction = function(type, data) {
    data.type = type
    log(['sending', data.type, data.left, data.top, data.score, data.succeeded, data.formation, data])
    socket.emit('message', data)
  }


})(jQuery)
