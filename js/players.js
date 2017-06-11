var WIDTH = 96;
var HEIGHT = 60;
var DEAD_WIDTH = 12;
var DEAD_HEIGHT = 60;
var NAMES = [
  'Saber',
  'Tooth',
  'Moose',
  'Lion',
  'Peanut',
  'Jelly',
  'Thyme',
  'Zombie',
  'Cranberry',
  'Pipa',
  'Walnut',
  'Puddle',
  'Ziya',
  'Key',
];
var MOVEMENT_RATE = 140;
var MIN_ACTIVE = 6;

var PLAYER;
var PLAYERS = {};
var MAP = [];

var Dom = require('./dom');
var Util = require('./util');
var Html = require('./html');

function displayMessage(text) {
  PLAYER.hideWelcome();
  var message = Html.div('.message', text);
  Dom.get('board-container').appendChild(message);
}

function animate(duration, start, end) {
  setTimeout(function() {
    start();
    if (end) setTimeout(end, duration);
  }, 0);
}

function scoreChange(delta) {
  Dom.get('score').textContent = PLAYER.score;
  Dom.get('success').textContent = PLAYER.successRate();
  var popup = Html.div('.score.abs.center', (delta > 0 ? '+' : '') + delta);
  Dom.addClass(popup, delta > 0 ? 'positive' : 'negative');
  popup.style.left = PLAYER.getScreenLeft() - 200 + 'px';
  popup.style.top = PLAYER.getScreenTop() - 50 + 'px';
  document.body.appendChild(popup);
  animate(600, Dom.addClass.bind(null, popup, 'scale'), Dom.remove.bind(null, popup), 600);
}

var Player = function Player(id, left, top, isSelf) {
  this.id = id;
  this.el = Html.div('.player');
  Dom.get('board').appendChild(this.el);
  if (!left) {
    left = Math.floor(Math.random() * WIDTH);
    top = Math.floor(Math.random() * HEIGHT);
    while (!this.setPosition(left, top)) {
      left = Math.floor(Math.random() * WIDTH);
      top = Math.floor(Math.random() * HEIGHT);
    }
  } else {
    this.setPosition(left, top);
  }

  this.isSelf = isSelf;
  this.name = NAMES[Math.floor(Math.random() * NAMES.length)];
  this.score = 0;
  this.succeeded = 0;
  this.total = 0;
  this.completed = 0;
  this.lockedIn = false;

  this.moveIntervals = {};

  if (isSelf) {
    Dom.addClass(this.el, 'self');
    this.sendInfo();
  }
  Dom.listen(this.el, 'mouseover', this.showTooltip.bind(this));
  Dom.listen(this.el, 'mouseout', this.hideTooltip.bind(this));
};

Player.atPixel = function(x, y) {
  return Player.atPosition(Player.getLeft(x), Player.getTop(y));
};

Player.atPosition = function(left, top) {
  if (!MAP[left]) MAP[left] = [];
  return MAP[left][top];
};

Player.getLeft = function(x) {
  return Math.floor(x / 10);
};
Player.getTop = function(y) {
  return Math.floor(y / 10);
};

Player.directions = {
  left: function(left, top) {
    return [left - 1, top];
  },
  right: function(left, top) {
    return [left + 1, top];
  },
  up: function(left, top) {
    return [left, top - 1];
  },
  down: function(left, top) {
    return [left, top + 1];
  },
};

Player.prototype = {
  getX: function() {
    return this.left * 10 + 1;
  },
  getY: function() {
    return this.top * 10 + 1;
  },

  getScreenLeft: function() {
    return this.getX() + Dom.left(this.el.offsetParent);
  },
  getScreenTop: function() {
    return this.getY() + Dom.top(this.el.offsetParent);
  },

  setPosition: function(left, top) {
    // cancel in case of collisions
    if (Player.atPosition(left, top)) return false;
    // cancel if out of bounds
    if (left < 0 || left >= WIDTH) return false;
    if (top < 0 || top >= HEIGHT) return false;
    // cancel if in dead area
    if (left < DEAD_WIDTH && top < DEAD_HEIGHT) return false;

    if (!MAP[this.left]) MAP[this.left] = [];
    MAP[this.left][this.top] = null;
    var first = this.left === undefined;
    this.left = left;
    this.top = top;
    if (!MAP[left]) MAP[left] = [];
    MAP[left][top] = this;

    this.el.style.left = this.getX() + 'px';
    this.el.style.top = this.getY() + 'px';

    if (this.welcome) this.positionWelcome();

    return true;
  },

  move: function(direction) {
    if (this.lockedIn) return;
    var newp = Player.directions[direction](this.left, this.top);
    var changed = this.setPosition(newp[0], newp[1]);
    if (changed && this.isSelf) {
      this.sendInfo();
      Dom.removeClass(this.el, 'idle');
    }
  },

  startMove: function(direction) {
    var p = this;
    if (p.moveIntervals[direction]) return;
    p.move(direction);
    this.moveIntervals[direction] = setInterval(function() {
      p.move(direction);
    }, MOVEMENT_RATE);
  },

  stopMove: function(direction) {
    clearInterval(this.moveIntervals[direction]);
    this.moveIntervals[direction] = null;
  },

  startFlash: function() {
    Dom.addClass(this.el, 'flash');
    if (this.isSelf) socket.emit('flash', {});
  },

  stopFlash: function() {
    Dom.removeClass(this.el, 'flash');
    if (this.isSelf) socket.emit('flash', {stop: true});
  },

  startLockIn: function() {
    if (this.lockedIn) return;
    Dom.addClass(this.el, 'locked-in');
    this.lockedIn = true;
    if (this.isSelf) socket.emit('lockIn', {});
  },

  stopLockIn: function() {
    if (!this.lockedIn) return;
    Dom.removeClass(this.el, 'locked-in');
    this.lockedIn = false;
    if (this.isSelf) socket.emit('lockIn', {stop: true});
  },

  formationDeadline: function(success, gain, loss) {
    this.total++;
    if (success) {
      Dom.addClass(this.el, 'active');
      var el = this.el;
      setTimeout(function() {
        Dom.removeClass(el, 'active');
      }, 1000);
      this.score += gain;
      this.succeeded++;
      if (this.isSelf) scoreChange(+gain);
      Dom.removeClass(this.el, 'idle');
    } else {
      this.score = Math.max(0, this.score - loss);
      if (this.isSelf) scoreChange(-loss);
    }
  },

  successRate: function() {
    if (this.total == 0) return 100;
    return Math.round(1000.0 * this.succeeded / this.total) / 10;
  },

  sendInfo: function(full) {
    if (full) {
      socket.emit('info', {
        left: this.left,
        top: this.top,
        name: this.name,
        score: this.score,
        total: this.total,
        succeeded: this.succeeded,
      });
    } else {
      Util.rateLimit(this, MOVEMENT_RATE / 2, function() {
        socket.emit('info', {left: this.left, top: this.top});
      });
    }
  },

  getInfo: function(info) {
    if (info.left) this.setPosition(info.left, info.top);
    if (info.name) this.name = info.name;
    if (info.score) this.score = info.score;
    if (info.total) this.total = info.total;
    if (info.succeeded) this.succeeded = info.succeeded;
  },

  showTooltip: function() {
    var tooltip = Html.div('.tooltip.pas', [
      Html.h3('.b.medium.mbs', this.name),
      Html.div('.col.mrs.light', [Html.div('.large.b', this.score), 'points']),
      Html.div('.col.dim', [Html.div('.large.b', this.successRate() + '%'), 'success']),
    ]);
    document.body.appendChild(tooltip);
    tooltip.style.left = this.getScreenLeft() - tooltip.offsetWidth / 2 + 5 + 'px';
    tooltip.style.top = this.getScreenTop() - tooltip.offsetHeight - 15 + 'px';
    this.tooltip = tooltip;
  },

  hideTooltip: function() {
    if (this.tooltip) {
      Dom.remove(this.tooltip);
      delete this.tooltip;
    }
  },

  showWelcome: function() {
    var welcome = Html.div('.welcome.pam', {}, {width: '240px'}, [
      Html.h3('.b.medium', 'Welcome to life as a pixel'),
      Html.p('.mtm', ['Use your ', Html.span('.arrow-image', 'arrows'), ' keys to move']),
    ]);

    this.welcome = welcome;
    document.body.appendChild(welcome);
    this.positionWelcome(true);
  },

  hideWelcome: function() {
    if (!this.welcome) return;
    this.welcome.style.opacity = 0;
    var self = this;
    setTimeout(function() {
      if (!self.welcome) return;
      Dom.remove(self.welcome);
      delete self.welcomeCountdown;
      delete self.welcome;
    }, 1000);
  },

  positionWelcome: function(first) {
    if (!first) {
      Dom.empty(this.welcome);
      this.welcome.appendChild(Html.p('Get into a formation with other players before the countdown expires.'));
      this.welcomeCountdown--;
      if (this.welcomeCountdown == 0) {
        this.hideWelcome();
      }
      setTimeout(this.hideWelcome.bind(this), 10000);
    } else {
      this.welcomeCountdown = 20;
      var welcome = this.welcome;
      welcome.style.opacity = 0;
      setTimeout(function() {
        Dom.addClass(welcome, 'fade');
        welcome.style.opacity = 1;
      }, 100);
    }
    this.welcome.style.left = this.getScreenLeft() - this.welcome.offsetWidth / 2 + 5 + 'px';
    this.welcome.style.top = this.getScreenTop() - this.welcome.offsetHeight - 15 + 'px';
  },
};

// sockets

var io = require('socket.io-client');
var socket = io.connect('');

function loadPlayer(data) {
  if (!PLAYERS[data.id]) {
    PLAYERS[data.id] = new Player(data.id, data.left, data.top);
  }
  if (!data.name) Dom.removeClass(PLAYERS[data.id].el, 'idle');
  PLAYERS[data.id].getInfo(data);
}

socket.on('welcome', function(data) {
  for (id in data.players) loadPlayer(data.players[id]);
  if (PLAYER) {
    PLAYER.id = data.id;
  } else {
    PLAYER = new Player(data.id, null, null, true);
    PLAYER.showWelcome();
  }
});

socket.on('info', function(data) {
  if (PLAYER && data.id == PLAYER.id) {
    PLAYER.getInfo(data);
    if (data.score) Dom.get('score').textContent = data.score;
  } else {
    loadPlayer(data);
  }
});

socket.on('flash', function(data) {
  if (PLAYERS[data.id]) {
    if (data.stop) {
      PLAYERS[data.id].stopFlash();
    } else {
      PLAYERS[data.id].startFlash();
    }
  }
});

socket.on('lockIn', function(data) {
  if (PLAYERS[data.id]) {
    if (data.stop) {
      PLAYERS[data.id].stopLockIn();
    } else {
      PLAYERS[data.id].startLockIn();
    }
  }
});

socket.on('idle', function(data) {
  if (PLAYERS[data.id]) Dom.addClass(PLAYERS[data.id].el, 'idle');
  if (PLAYER && data.id == PLAYER.id) Dom.addClass(PLAYER.el, 'idle');
});

socket.on('connected', function(data) {});

socket.on('disconnected', function(data) {
  var p = PLAYERS[data.id];
  if (!p) return;
  delete MAP[p.left][p.top];
  Dom.remove(PLAYERS[data.id].el);
  delete PLAYERS[data.id];
});

function contains(el, list) {
  return list.indexOf(el) >= 0;
}

socket.on('formation', function(data) {
  if (!PLAYER || !PLAYER.id) return;
  PLAYER.formationDeadline(contains(PLAYER.id, data.ids), data.gain, data.loss);
  Util.each(PLAYERS, function(id, player) {
    player.formationDeadline(contains(id, data.ids), data.gain, data.loss);
  });
});

function showFormation(map) {
  var f = Dom.get('formation-image');
  Dom.empty(f);
  var width = 0;
  var height = 0;
  map.forEach(function(row, y) {
    if (row)
      row.forEach(function(cell, x) {
        if (!cell) return;
        var p = Html.div('.ref');
        f.appendChild(p);
        p.style.top = y * (p.offsetHeight + 1) + 'px';
        p.style.left = x * (p.offsetWidth + 1) + 'px';
        width = Math.max(width, x * (p.offsetWidth + 1) + p.offsetWidth);
        height = Math.max(height, y * (p.offsetHeight + 1) + p.offsetHeight);
      });
  });
  f.style.width = width + 'px';
  f.style.top = 50 - height / 2 + 'px';
}

var time;
var formationInterval;

socket.on('nextFormation', function(data) {
  Dom.get('formation-name').textContent = data.formation;
  showFormation(data.map);

  time = data.time;
  Dom.get('countdown').textContent = time;

  if (formationInterval) clearInterval(formationInterval);
  formationInterval = setInterval(function() {
    time--;
    Dom.get('countdown').textContent = time;
    if (time == 0) clearInterval(formationInterval);
  }, 1000);

  if (PLAYER.loggedin && data.active < MIN_ACTIVE) {
    showRequestPopup();
  }
});

var requestPopupShown = false;
var requestPopup;

function showRequestPopup() {
  if (requestPopupShown) return;
  var button = Dom.get('send');
  Dom.remove(button);
  Dom.removeClass(button, 'off');
  requestPopup = Html.div('.megaphone.pvs', [
    'Swarmation is extra fun with more people. Ask some friends to join: ',
    button,
  ]);
  Dom.get('container').appendChild(requestPopup);
  requestPopupShown = true;
}

var RESTARTING = false;

socket.on('restart', function(data) {
  RESTARTING = true;
  socket.disconnect();
  displayMessage('Swarmation needs to restart for an update. Please reload the page.');
});

socket.on('kick', function(data) {
  RESTARTING = true;
  socket.disconnect();
  displayMessage('You have been disconnected for being idle too long. Reload the page to resume playing.');
});

socket.on('connect', function() {
  if (PLAYER) PLAYER.sendInfo(true);
  for (var id in PLAYERS) Dom.remove(PLAYERS[id].el);
  PLAYERS = {};
  MAP = [];
});

socket.on('disconnect', function() {
  if (RESTARTING) return;
  var interval;
  function connect() {
    if (socket.connected) {
      clearInterval(interval);
    } else {
      socket = io.connect();
    }
  }
  connect();
  interval = setInterval(connect, 1000);
});

var MOVEMENTS = {
  38: 'up',
  40: 'down',
  37: 'left',
  39: 'right',
};

function stop(event) {
  event.preventDefault();
  event.stopPropagation();
}

Dom.listen(document, 'keydown', function(event) {
  if (!PLAYER) return;

  if (MOVEMENTS[event.keyCode]) {
    PLAYER.startMove(MOVEMENTS[event.keyCode]);
    stop(event);
  } else if (event.keyCode == 32) {
    // space
    PLAYER.startFlash();
    stop(event);
  } else if (event.keyCode == 83) {
    // "s"
    PLAYER.startLockIn();
    stop(event);
  }
});

Dom.listen(document, 'keyup', function(event) {
  if (!PLAYER) return;

  if (MOVEMENTS[event.keyCode]) {
    PLAYER.stopMove(MOVEMENTS[event.keyCode]);
    stop(event);
  } else if (event.keyCode == 32) {
    // space
    PLAYER.stopFlash();
    stop(event);
  }
});

var Players = {};

Players.login = function(userId, token, name) {
  if (!PLAYER) return;
  var login = Dom.get('login');
  var username = Html.div('.top-border.pvm.phm.light', 'Welcome, ' + name);
  var parent = login.parentNode;
  Dom.remove(login);
  parent.appendChild(username);
  socket.emit('login', {token: token, userId: userId, name: name});
  PLAYER.name = name;
  PLAYER.loggedin = true;
  PLAYER.sendInfo(true);
};

module.exports = Players;
