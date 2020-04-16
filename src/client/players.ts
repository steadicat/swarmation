import {
  DisconnectedMessage,
  FlashMessage,
  FormationMessage,
  IdleMessage,
  InfoMessage,
  LockInMessage,
  NextFormationMessage,
  PlayerInfo,
  WelcomeMessage,
} from '../types';
import * as Dom from './dom';
import * as Html from './html';

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

let PLAYER: Player | null = null;
let PLAYERS: {[id: string]: Player} = {};
let MAP: Player[][] = [];

import * as io from 'socket.io-client';
let socket = io.connect('');

function displayMessage(text: string) {
  PLAYER.hideWelcome();
  const message = Html.div('.message', text);
  Dom.get('board-container').appendChild(message);
}

function animate(duration: number, start: () => void, end: () => void) {
  setTimeout(() => {
    start();
    if (end) setTimeout(end, duration);
  }, 0);
}

function scoreChange(delta: number) {
  Dom.get('score').textContent = PLAYER.score + '';
  Dom.get('success').textContent = PLAYER.successRate() + '';
  const popup = Html.div('.score.abs.center', (delta > 0 ? '+' : '') + delta);
  Dom.addClass(popup, delta > 0 ? 'positive' : 'negative');
  popup.style.left = PLAYER.getScreenLeft() - 200 + 'px';
  popup.style.top = PLAYER.getScreenTop() - 50 + 'px';
  document.body.appendChild(popup);
  animate(600, Dom.addClass.bind(null, popup, 'scale'), Dom.remove.bind(null, popup));
}

type Direction = 'left' | 'right' | 'up' | 'down';

class Player {
  id: string;
  el: HTMLDivElement;
  isSelf: boolean;
  score = 0;
  succeeded = 0;
  total = 0;
  completed = 0;
  latestTimestamp = 0;
  lockedIn = false;
  loggedIn = false;
  moveIntervals: {[key in Direction]?: NodeJS.Timer} = {};
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
    this.el.addEventListener('mouseover', this.showTooltip.bind(this));
    this.el.addEventListener('mouseout', this.hideTooltip.bind(this));
  }

  static atPixel(x: number, y: number): Player {
    return Player.atPosition(Player.getLeft(x), Player.getTop(y));
  }

  static atPosition(left: number, top: number): Player {
    if (!MAP[left]) MAP[left] = [];
    return MAP[left][top];
  }

  static getLeft(x: number): number {
    return Math.floor(x / 10);
  }
  static getTop(y: number): number {
    return Math.floor(y / 10);
  }

  static directions = {
    left(left: number, top: number): [number, number] {
      return [left - 1, top];
    },
    right(left: number, top: number): [number, number] {
      return [left + 1, top];
    },
    up(left: number, top: number): [number, number] {
      return [left, top - 1];
    },
    down(left: number, top: number): [number, number] {
      return [left, top + 1];
    },
  };

  getX(): number {
    return this.left * 10 + 1;
  }
  getY(): number {
    return this.top * 10 + 1;
  }

  getScreenLeft(): number {
    return (
      this.getX() +
      (this.el.offsetParent as HTMLElement).getBoundingClientRect().left +
      window.pageXOffset
    );
  }
  getScreenTop(): number {
    return (
      this.getY() +
      (this.el.offsetParent as HTMLElement).getBoundingClientRect().top +
      window.pageYOffset
    );
  }

  setPosition(left: number, top: number): boolean {
    // cancel in case of collisions
    if (Player.atPosition(left, top)) return false;
    // cancel if out of bounds
    if (left < 0 || left >= WIDTH) return false;
    if (top < 0 || top >= HEIGHT) return false;
    // cancel if in dead area
    if (left < DEAD_WIDTH && top < DEAD_HEIGHT) return false;

    if (!MAP[this.left]) MAP[this.left] = [];
    MAP[this.left][this.top] = null;
    this.left = left;
    this.top = top;
    if (!MAP[left]) MAP[left] = [];
    MAP[left][top] = this;

    this.el.style.left = this.getX() + 'px';
    this.el.style.top = this.getY() + 'px';

    if (this.welcome) this.positionWelcome();

    return true;
  }

  move(direction: Direction) {
    if (this.lockedIn) return;
    const newp = Player.directions[direction](this.left, this.top);
    const changed = this.setPosition(newp[0], newp[1]);
    if (changed) {
      this.sendInfo();
      Dom.removeClass(this.el, 'idle');
    }
  }

  startMove(direction: Direction) {
    if (this.moveIntervals[direction]) return;
    this.move(direction);
    this.moveIntervals[direction] = setInterval(() => {
      this.move(direction);
    }, MOVEMENT_RATE);
  }

  stopMove(direction: Direction) {
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

  formationDeadline(success: boolean, gain: number, loss: number) {
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

  successRate(): number {
    if (this.total === 0) return 100;
    return Math.round((1000.0 * this.succeeded) / this.total) / 10;
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
      this.latestTimestamp = Date.now();
      socket.emit('info', {left: this.left, top: this.top, time: this.latestTimestamp});
    }
  }

  getInfo(info: PlayerInfo) {
    if (info.left && (!this.isSelf || info.time === this.latestTimestamp))
      this.setPosition(info.left, info.top);
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
    setTimeout(() => {
      if (!this.welcome) return;
      Dom.remove(this.welcome);
      delete this.welcomeCountdown;
      delete this.welcome;
    }, 1000);
  }

  positionWelcome(first = false) {
    if (!first) {
      this.welcome.innerHTML = '';
      this.welcome.appendChild(
        Html.p('Get into a formation with other players before the countdown expires.')
      );
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

export function start() {
  // no-op, called to trigger evaluation of the module
}

function loadPlayer(data: PlayerInfo) {
  if (!PLAYERS[data.id]) {
    PLAYERS[data.id] = new Player(data.id, data.left, data.top);
  }
  if (!data.name) Dom.removeClass(PLAYERS[data.id].el, 'idle');
  PLAYERS[data.id].getInfo(data);
}

socket.on('welcome', (data: WelcomeMessage) => {
  for (const id in data.players) loadPlayer(data.players[id]);
  if (PLAYER) {
    PLAYER.id = data.id;
  } else {
    PLAYER = new Player(data.id, null, null, true);
    PLAYER.showWelcome();
  }
});

socket.on('info', (data: InfoMessage) => {
  if (PLAYER && data.id === PLAYER.id) {
    PLAYER.getInfo(data);
    if (data.score) Dom.get('score').textContent = data.score + '';
  } else {
    loadPlayer(data);
  }
});

socket.on('flash', (data: FlashMessage) => {
  if (PLAYERS[data.id]) {
    if (data.stop) {
      PLAYERS[data.id].stopFlash();
    } else {
      PLAYERS[data.id].startFlash();
    }
  }
});

socket.on('lockIn', (data: LockInMessage) => {
  if (PLAYERS[data.id]) {
    if (data.stop) {
      PLAYERS[data.id].stopLockIn();
    } else {
      PLAYERS[data.id].startLockIn();
    }
  }
});

socket.on('idle', (data: IdleMessage) => {
  if (PLAYERS[data.id]) Dom.addClass(PLAYERS[data.id].el, 'idle');
  if (PLAYER && data.id === PLAYER.id) Dom.addClass(PLAYER.el, 'idle');
});

socket.on('disconnected', (data: DisconnectedMessage) => {
  const p = PLAYERS[data.id];
  if (!p) return;
  delete MAP[p.left][p.top];
  Dom.remove(PLAYERS[data.id].el);
  delete PLAYERS[data.id];
});

function contains<T>(el: T, list: T[]): boolean {
  return list.indexOf(el) >= 0;
}

socket.on('formation', (data: FormationMessage) => {
  if (!PLAYER || !PLAYER.id) return;
  PLAYER.formationDeadline(contains(PLAYER.id, data.ids), data.gain, data.loss);
  for (const id in PLAYERS) {
    const player = PLAYERS[id];
    player.formationDeadline(contains(id, data.ids), data.gain, data.loss);
    player.stopLockIn();
  }
  PLAYER.stopLockIn();
});

function showFormation(map: boolean[][]) {
  const f = Dom.get('formation-image');
  f.innerHTML = '';
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

let time: number;
let formationInterval: NodeJS.Timer;
let weeklyGameNoticeShown = false;

let requestPopupShown = false;

function showRequestPopup() {
  if (requestPopupShown) return;
  const button = Dom.get('send');
  Dom.remove(button);
  Dom.removeClass(button, 'off');
  const requestPopup = Html.div('.megaphone.pvs', [
    'Swarmation is extra fun with more people. Ask some friends to join: ',
    button,
  ]);
  Dom.get('container').appendChild(requestPopup);
  requestPopupShown = true;
}

socket.on('nextFormation', (message: NextFormationMessage) => {
  Dom.get('formation-name').textContent = message.formation;
  showFormation(message.map);

  time = message.time;
  Dom.get('countdown').textContent = time + '';

  if (formationInterval) clearInterval(formationInterval);
  formationInterval = setInterval(() => {
    time--;
    Dom.get('countdown').textContent = time + '';
    if (time === 0) clearInterval(formationInterval);
  }, 1000);

  if (PLAYER.loggedIn && message.active < MIN_ACTIVE) {
    if (!weeklyGameNoticeShown) showRequestPopup();
  }
});

const nextWeeklyGame = new Date(Date.UTC(2017, 5, 15, 11));

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

function twelveHours(hours: number) {
  if (hours === 0) return 12;
  if (hours === 12) return 12;
  if (hours > 12) return hours - 12;
  return hours;
}

function ampm(hours: number) {
  return hours === 0 || hours < 12 ? 'am' : 'pm';
}

function showWeeklyGameNotice() {
  if (weeklyGameNoticeShown) return;
  const button = Dom.get('send');
  Dom.remove(button);
  Dom.removeClass(button, 'off');
  const t = new Date();
  const d = nextWeeklyGame;
  const isToday =
    t.getFullYear() === d.getFullYear() &&
    t.getMonth() === d.getMonth() &&
    t.getDate() === d.getDate();
  const weeklyGameNotice = Html.div('.megaphone.pvs', [
    isToday
      ? `Join us this TODAY – ${monthNames[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} – at `
      : `Join us this ${dayNames[d.getDay()]} – ${
          monthNames[d.getMonth()]
        } ${d.getDate()}, ${d.getFullYear()} – at `,
    Html.a(
      '',
      {href: 'http://erthbeet.com/?Universal_World_Time=kv2300'},
      twelveHours(d.getHours()) + ampm(d.getHours())
    ),
    ' for a big game of Swarmation!',
  ]);
  Dom.get('container').appendChild(weeklyGameNotice);
  weeklyGameNoticeShown = true;
}

if (new Date() < nextWeeklyGame) {
  showWeeklyGameNotice();
}

let RESTARTING = false;

socket.on('restart', () => {
  RESTARTING = true;
  socket.disconnect();
  displayMessage('Swarmation needs to restart for an update. Please reload the page.');
});

socket.on('kick', () => {
  RESTARTING = true;
  socket.disconnect();
  displayMessage(
    'You have been disconnected for being idle too long. Reload the page to resume playing.'
  );
});

socket.on('connect', () => {
  if (PLAYER) PLAYER.sendInfo(true);
  for (const id in PLAYERS) Dom.remove(PLAYERS[id].el);
  PLAYERS = {};
  MAP = [];
});

socket.on('disconnect', () => {
  if (RESTARTING) return;
  // eslint-disable-next-line prefer-const
  let interval: NodeJS.Timer;
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
  '38': 'up' as 'up',
  '40': 'down' as 'down',
  '37': 'left' as 'left',
  '39': 'right' as 'right',
};

function stop(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
}

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (!PLAYER) return;

  const keyCode = (event.keyCode + '') as keyof typeof MOVEMENTS;
  if (MOVEMENTS[keyCode]) {
    PLAYER.startMove(MOVEMENTS[keyCode]);
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

document.addEventListener('keyup', (event: KeyboardEvent) => {
  if (!PLAYER) return;

  const keyCode = (event.keyCode + '') as keyof typeof MOVEMENTS;
  if (MOVEMENTS[keyCode]) {
    PLAYER.stopMove(MOVEMENTS[keyCode]);
    stop(event);
  } else if (event.keyCode === 32) {
    // space
    PLAYER.stopFlash();
    stop(event);
  }
});

export function login(userId: string, token: string, name: string) {
  if (!PLAYER) return;
  const login = Dom.get('login');
  const username = Html.div('.top-border.pvm.phm.light', 'Welcome, ' + name);
  const parent = login.parentNode;
  Dom.remove(login);
  parent.appendChild(username);
  socket.emit('login', {token, userId, name});
  PLAYER.name = name;
  PLAYER.loggedIn = true;
  PLAYER.sendInfo(true);
}
