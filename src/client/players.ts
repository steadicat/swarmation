const WIDTH = 96;
const HEIGHT = 60;
const DEAD_WIDTH = 12;
const DEAD_HEIGHT = 60;
const NAMES = [
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
const MOVEMENT_RATE = 140;
const MIN_ACTIVE = 6;

let PLAYER;
let PLAYERS: {[id: string]: Player} = {};
let MAP = [];

import * as Util from '../util';
import * as Dom from './dom';
import * as Html from './html';

function displayMessage(text) {
  PLAYER.hideWelcome();
  const message = Html.div('.message', text);
  Dom.get('board-container').appendChild(message);
}

function animate(duration, start, end) {
  setTimeout(() => {
    start();
    if (end) setTimeout(end, duration);
  }, 0);
}

function scoreChange(delta) {
  Dom.get('score').textContent = PLAYER.score;
  Dom.get('success').textContent = PLAYER.successRate();
  const popup = Html.div('.score.abs.center', (delta > 0 ? '+' : '') + delta);
  Dom.addClass(popup, delta > 0 ? 'positive' : 'negative');
  popup.style.left = PLAYER.getScreenLeft() - 200 + 'px';
  popup.style.top = PLAYER.getScreenTop() - 50 + 'px';
  document.body.appendChild(popup);
  animate(600, Dom.addClass.bind(null, popup, 'scale'), Dom.remove.bind(null, popup));
}

class Player {
  id: string;
  el: HTMLDivElement;
  isSelf: boolean;
  score = 0;
  succeeded = 0;
  total = 0;
  completed = 0;
  lockedIn = false;
  moveIntervals = {};
  name: string;
  left: number;
  top: number;

  welcomeCountdown?: number;
  welcome?: HTMLDivElement;
  tooltip?: HTMLDivElement;

  constructor(id: string, left: number, top: number, isSelf = false) {
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

    if (isSelf) {
      Dom.addClass(this.el, 'self');
      this.sendInfo();
    }
    Dom.listen(this.el, 'mouseover', this.showTooltip.bind(this));
    Dom.listen(this.el, 'mouseout', this.hideTooltip.bind(this));
  }

  static atPixel(x, y) {
    return Player.atPosition(Player.getLeft(x), Player.getTop(y));
  }

  static atPosition(left, top) {
    if (!MAP[left]) MAP[left] = [];
    return MAP[left][top];
  }

  static getLeft(x) {
    return Math.floor(x / 10);
  }
  static getTop(y) {
    return Math.floor(y / 10);
  }

  static directions = {
    left(left, top) {
      return [left - 1, top];
    },
    right(left, top) {
      return [left + 1, top];
    },
    up(left, top) {
      return [left, top - 1];
    },
    down(left, top) {
      return [left, top + 1];
    },
  };

  getX() {
    return this.left * 10 + 1;
  }
  getY() {
    return this.top * 10 + 1;
  }

  getScreenLeft() {
    return this.getX() + Dom.left(this.el.offsetParent);
  }
  getScreenTop() {
    return this.getY() + Dom.top(this.el.offsetParent);
  }

  setPosition(left, top) {
    // cancel in case of collisions
    if (Player.atPosition(left, top)) return false;
    // cancel if out of bounds
    if (left < 0 || left >= WIDTH) return false;
    if (top < 0 || top >= HEIGHT) return false;
    // cancel if in dead area
    if (left < DEAD_WIDTH && top < DEAD_HEIGHT) return false;

    if (!MAP[this.left]) MAP[this.left] = [];
    MAP[this.left][this.top] = null;
    const first = this.left === undefined;
    this.left = left;
    this.top = top;
    if (!MAP[left]) MAP[left] = [];
    MAP[left][top] = this;

    this.el.style.left = this.getX() + 'px';
    this.el.style.top = this.getY() + 'px';

    if (this.welcome) this.positionWelcome();

    return true;
  }

  move(direction) {
    if (this.lockedIn) return;
    const newp = Player.directions[direction](this.left, this.top);
    const changed = this.setPosition(newp[0], newp[1]);
    if (changed && this.isSelf) {
      this.sendInfo();
      Dom.removeClass(this.el, 'idle');
    }
  }

  startMove(direction) {
    const p = this;
    if (p.moveIntervals[direction]) return;
    p.move(direction);
    this.moveIntervals[direction] = setInterval(() => {
      p.move(direction);
    }, MOVEMENT_RATE);
  }

  stopMove(direction) {
    clearInterval(this.moveIntervals[direction]);
    this.moveIntervals[direction] = null;
  }

  startFlash() {
    Dom.addClass(this.el, 'flash');
    if (this.isSelf) socket.emit('flash', {});
  }

  stopFlash() {
    Dom.removeClass(this.el, 'flash');
    if (this.isSelf) socket.emit('flash', {stop: true});
  }

  startLockIn() {
    if (this.lockedIn) return;
    Dom.addClass(this.el, 'locked-in');
    this.lockedIn = true;
    if (this.isSelf) socket.emit('lockIn', {});
  }

  stopLockIn() {
    if (!this.lockedIn) return;
    Dom.removeClass(this.el, 'locked-in');
    this.lockedIn = false;
    if (this.isSelf) socket.emit('lockIn', {stop: true});
  }

  formationDeadline(success, gain, loss) {
    this.total++;
    if (success) {
      Dom.addClass(this.el, 'active');
      const el = this.el;
      setTimeout(() => {
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
  }

  successRate() {
    if (this.total === 0) return 100;
    return Math.round(1000.0 * this.succeeded / this.total) / 10;
  }

  sendInfo(full = false) {
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
  }

  getInfo(info) {
    if (info.left) this.setPosition(info.left, info.top);
    if (info.name) this.name = info.name;
    if (info.score) this.score = info.score;
    if (info.total) this.total = info.total;
    if (info.succeeded) this.succeeded = info.succeeded;
  }

  showTooltip() {
    const tooltip = Html.div('.tooltip.pas', [
      Html.h3('.b.medium.mbs', this.name),
      Html.div('.col.mrs.light', [Html.div('.large.b', this.score), 'points']),
      Html.div('.col.dim', [Html.div('.large.b', this.successRate() + '%'), 'success']),
    ]);
    document.body.appendChild(tooltip);
    tooltip.style.left = this.getScreenLeft() - tooltip.offsetWidth / 2 + 5 + 'px';
    tooltip.style.top = this.getScreenTop() - tooltip.offsetHeight - 15 + 'px';
    this.tooltip = tooltip;
  }

  hideTooltip() {
    if (this.tooltip) {
      Dom.remove(this.tooltip);
      delete this.tooltip;
    }
  }

  showWelcome() {
    const welcome = Html.div('.welcome.pam', {}, {width: '240px'}, [
      Html.h3('.b.medium', 'Welcome to life as a pixel'),
      Html.p('.mtm', ['Use your ', Html.span('.arrow-image', 'arrow'), ' keys to move']),
    ]);

    this.welcome = welcome;
    document.body.appendChild(welcome);
    this.positionWelcome(true);
  }

  hideWelcome() {
    if (!this.welcome) return;
    this.welcome.style.opacity = '0';
    const self = this;
    setTimeout(() => {
      if (!self.welcome) return;
      Dom.remove(self.welcome);
      delete self.welcomeCountdown;
      delete self.welcome;
    }, 1000);
  }

  positionWelcome(first = false) {
    if (!first) {
      Dom.empty(this.welcome);
      this.welcome.appendChild(Html.p('Get into a formation with other players before the countdown expires.'));
      this.welcomeCountdown--;
      if (this.welcomeCountdown === 0) {
        this.hideWelcome();
      }
      setTimeout(this.hideWelcome.bind(this), 10000);
    } else {
      this.welcomeCountdown = 20;
      const welcome = this.welcome;
      welcome.style.opacity = '0';
      setTimeout(() => {
        Dom.addClass(welcome, 'fade');
        welcome.style.opacity = '1';
      }, 100);
    }
    this.welcome.style.left = this.getScreenLeft() - this.welcome.offsetWidth / 2 + 5 + 'px';
    this.welcome.style.top = this.getScreenTop() - this.welcome.offsetHeight - 15 + 'px';
  }
}

// sockets

import * as io from 'socket.io-client';
let socket = io.connect('');

export function start() {
  // no-op, called to trigger evaluation of the module
}

function loadPlayer(data) {
  if (!PLAYERS[data.id]) {
    PLAYERS[data.id] = new Player(data.id, data.left, data.top);
  }
  if (!data.name) Dom.removeClass(PLAYERS[data.id].el, 'idle');
  PLAYERS[data.id].getInfo(data);
}

socket.on('welcome', data => {
  for (const id in data.players) loadPlayer(data.players[id]);
  if (PLAYER) {
    PLAYER.id = data.id;
  } else {
    PLAYER = new Player(data.id, null, null, true);
    PLAYER.showWelcome();
  }
});

socket.on('info', data => {
  if (PLAYER && data.id === PLAYER.id) {
    PLAYER.getInfo(data);
    if (data.score) Dom.get('score').textContent = data.score;
  } else {
    loadPlayer(data);
  }
});

socket.on('flash', data => {
  if (PLAYERS[data.id]) {
    if (data.stop) {
      PLAYERS[data.id].stopFlash();
    } else {
      PLAYERS[data.id].startFlash();
    }
  }
});

socket.on('lockIn', data => {
  if (PLAYERS[data.id]) {
    if (data.stop) {
      PLAYERS[data.id].stopLockIn();
    } else {
      PLAYERS[data.id].startLockIn();
    }
  }
});

socket.on('idle', data => {
  if (PLAYERS[data.id]) Dom.addClass(PLAYERS[data.id].el, 'idle');
  if (PLAYER && data.id === PLAYER.id) Dom.addClass(PLAYER.el, 'idle');
});

socket.on('connected', data => {});

socket.on('disconnected', data => {
  const p = PLAYERS[data.id];
  if (!p) return;
  delete MAP[p.left][p.top];
  Dom.remove(PLAYERS[data.id].el);
  delete PLAYERS[data.id];
});

function contains(el, list) {
  return list.indexOf(el) >= 0;
}

socket.on('formation', data => {
  if (!PLAYER || !PLAYER.id) return;
  PLAYER.formationDeadline(contains(PLAYER.id, data.ids), data.gain, data.loss);
  Object.entries(PLAYERS).forEach(([id, player]) => {
    player.formationDeadline(contains(id, data.ids), data.gain, data.loss);
    player.stopLockIn();
  });
  PLAYER.stopLockIn();
});
``;

function showFormation(map) {
  const f = Dom.get('formation-image');
  Dom.empty(f);
  let width = 0;
  let height = 0;
  map.forEach((row, y) => {
    if (row)
      row.forEach((cell, x) => {
        if (!cell) return;
        const p = Html.div('.ref');
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

let time;
let formationInterval;

socket.on('nextFormation', data => {
  Dom.get('formation-name').textContent = data.formation;
  showFormation(data.map);

  time = data.time;
  Dom.get('countdown').textContent = time;

  if (formationInterval) clearInterval(formationInterval);
  formationInterval = setInterval(() => {
    time--;
    Dom.get('countdown').textContent = time;
    if (time === 0) clearInterval(formationInterval);
  }, 1000);

  if (PLAYER.loggedin && data.active < MIN_ACTIVE) {
    if (!weeklyGameNoticeShown) showRequestPopup();
  }
});

let requestPopupShown = false;
let requestPopup;

function showRequestPopup() {
  if (requestPopupShown) return;
  const button = Dom.get('send');
  Dom.remove(button);
  Dom.removeClass(button, 'off');
  requestPopup = Html.div('.megaphone.pvs', [
    'Swarmation is extra fun with more people. Ask some friends to join: ',
    button,
  ]);
  Dom.get('container').appendChild(requestPopup);
  requestPopupShown = true;
}

const nextWeeklyGame = new Date(Date.UTC(2017, 5, 15, 11));
let weeklyGameNoticeShown = false;
let weeklyGameNotice;

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function twelveHours(hours) {
  if (hours === 0) return 12;
  if (hours === 12) return 12;
  if (hours > 12) return hours - 12;
  return hours;
}

function ampm(hours) {
  return hours === 0 || hours < 12 ? 'am' : 'pm';
}

function showWeeklyGameNotice() {
  if (weeklyGameNoticeShown) return;
  const button = Dom.get('send');
  Dom.remove(button);
  Dom.removeClass(button, 'off');
  const t = new Date();
  const d = nextWeeklyGame;
  const isToday = t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
  weeklyGameNotice = Html.div('.megaphone.pvs', [
    isToday
      ? `Join us this TODAY – ${monthNames[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} – at `
      : `Join us this ${dayNames[d.getDay()]} – ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} – at `,
    Html.a('', {href: 'http://erthbeet.com/?Universal_World_Time=kv2300'}, twelveHours(d.getHours()) + ampm(d)),
    ' for a big game of Swarmation!',
  ]);
  Dom.get('container').appendChild(weeklyGameNotice);
  weeklyGameNoticeShown = true;
}

if (new Date() < nextWeeklyGame) {
  showWeeklyGameNotice();
}

let RESTARTING = false;

socket.on('restart', data => {
  RESTARTING = true;
  socket.disconnect();
  displayMessage('Swarmation needs to restart for an update. Please reload the page.');
});

socket.on('kick', data => {
  RESTARTING = true;
  socket.disconnect();
  displayMessage('You have been disconnected for being idle too long. Reload the page to resume playing.');
});

socket.on('connect', () => {
  if (PLAYER) PLAYER.sendInfo(true);
  for (const id in PLAYERS) Dom.remove(PLAYERS[id].el);
  PLAYERS = {};
  MAP = [];
});

socket.on('disconnect', () => {
  if (RESTARTING) return;
  let interval;
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

const MOVEMENTS = {
  38: 'up',
  40: 'down',
  37: 'left',
  39: 'right',
};

function stop(event) {
  event.preventDefault();
  event.stopPropagation();
}

Dom.listen(document, 'keydown', event => {
  if (!PLAYER) return;

  if (MOVEMENTS[event.keyCode]) {
    PLAYER.startMove(MOVEMENTS[event.keyCode]);
    stop(event);
  } else if (event.keyCode === 32) {
    // space
    PLAYER.startFlash();
    stop(event);
  } else if (event.keyCode === 83) {
    // "s"
    PLAYER.startLockIn();
    stop(event);
  }
});

Dom.listen(document, 'keyup', event => {
  if (!PLAYER) return;

  if (MOVEMENTS[event.keyCode]) {
    PLAYER.stopMove(MOVEMENTS[event.keyCode]);
    stop(event);
  } else if (event.keyCode === 32) {
    // space
    PLAYER.stopFlash();
    stop(event);
  }
});

export function login(userId, token, name) {
  if (!PLAYER) return;
  const login = Dom.get('login');
  const username = Html.div('.top-border.pvm.phm.light', 'Welcome, ' + name);
  const parent = login.parentNode;
  Dom.remove(login);
  parent.appendChild(username);
  socket.emit('login', {token, userId, name});
  PLAYER.name = name;
  PLAYER.loggedin = true;
  PLAYER.sendInfo(true);
}
