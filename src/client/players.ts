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
let MAP: (Player | null)[][] = [];

import * as io from 'socket.io-client';
let socket = io.connect('');

function displayMessage(text: string) {
  PLAYER.hideWelcome();
  const message = document.createElement('div');
  message.className = 'message';
  message.innerText = text;
  document.getElementById('board-container')?.appendChild(message);
}

function animate(duration: number, start: () => void, end: () => void) {
  setTimeout(() => {
    start();
    if (end) setTimeout(end, duration);
  }, 0);
}

function scoreChange(delta: number) {
  document.getElementById('score').textContent = PLAYER.score + '';
  document.getElementById('success').textContent = PLAYER.successRate() + '';
  const popup = document.createElement('div');
  popup.className = `score abs center ${delta > 0 ? 'positive' : 'negative'}`;
  popup.innerText = (delta > 0 ? '+' : '') + delta;
  popup.style.left = PLAYER.getScreenLeft() - 200 + 'px';
  popup.style.top = PLAYER.getScreenTop() - 50 + 'px';
  document.body.appendChild(popup);
  animate(
    600,
    () => popup.classList.add('scale'),
    () => popup.parentNode?.removeChild(popup)
  );
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
    this.el = document.createElement('div');
    this.el.className = 'player';
    document.getElementById('board')?.appendChild(this.el);
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
      this.el.classList.add('self');
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
      this.el.classList.remove('idle');
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
    this.el.classList.add('flash');
    if (this.isSelf) socket.emit('flash', {});
  }

  stopFlash() {
    this.el.classList.remove('flash');
    if (this.isSelf) socket.emit('flash', {stop: true});
  }

  startLockIn() {
    if (this.lockedIn) return;
    this.el.classList.add('locked-in');
    this.lockedIn = true;
    if (this.isSelf) socket.emit('lockIn', {});
  }

  stopLockIn() {
    if (!this.lockedIn) return;
    this.el.classList.remove('locked-in');
    this.lockedIn = false;
    if (this.isSelf) socket.emit('lockIn', {stop: true});
  }

  formationDeadline(success: boolean, gain: number, loss: number) {
    this.total++;
    if (success) {
      this.el.classList.add('active');
      const el = this.el;
      setTimeout(() => {
        el.classList.remove('active');
      }, 1000);
      this.score += gain;
      this.succeeded++;
      if (this.isSelf) scoreChange(+gain);
      this.el.classList.remove('idle');
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
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip pas';
    tooltip.innerHTML = `
      <h3 class="b medium mbs>${this.name}</h3>
      <div class="col mrs light">
        <div class="large b">${this.score}</div> points
      </div>
      <div class="col dim">
        <div class="large b">${this.successRate()}%</div> success
      </div>
    `;
    document.body.appendChild(tooltip);
    tooltip.style.left = this.getScreenLeft() - tooltip.offsetWidth / 2 + 5 + 'px';
    tooltip.style.top = this.getScreenTop() - tooltip.offsetHeight - 15 + 'px';
    this.tooltip = tooltip;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.parentNode?.removeChild(this.tooltip);
      delete this.tooltip;
    }
  }

  showWelcome() {
    const welcome = document.createElement('div');
    welcome.className = 'welcome pam';
    welcome.style.width = '240px';
    welcome.innerHTML = `
      <h3 class="b medium">Welcome to life as a pixel</h3>
      <p class="mtm">Use your <span class="arrow-image arrow"></span> keys to move</p>
    `;
    this.welcome = welcome;
    document.body.appendChild(welcome);
    this.positionWelcome(true);
  }

  hideWelcome() {
    if (!this.welcome) return;
    this.welcome.style.opacity = '0';
    setTimeout(() => {
      if (!this.welcome) return;
      this.welcome.parentNode?.removeChild(this.welcome);
      delete this.welcomeCountdown;
      delete this.welcome;
    }, 1000);
  }

  positionWelcome(first = false) {
    if (!first) {
      this.welcome.innerHTML = `
        <p>Get into a formation with other players before the countdown expires</p>
      `;
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
        welcome.classList.add('fade');
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
  if (!data.name) PLAYERS[data.id].el.classList.remove('idle');
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
    if (data.score) document.getElementById('score').textContent = data.score + '';
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
  if (PLAYERS[data.id]) PLAYERS[data.id].el.classList.add('idle');
  if (PLAYER && data.id === PLAYER.id) PLAYER.el.classList.add('idle');
});

socket.on('disconnected', (data: DisconnectedMessage) => {
  const p = PLAYERS[data.id];
  if (!p) return;
  delete MAP[p.left][p.top];
  PLAYERS[data.id].el.parentNode?.removeChild(PLAYERS[data.id].el);
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
  const f = document.getElementById('formation-image');
  f.innerHTML = '';
  let width = 0;
  let height = 0;
  map.forEach((row, y) => {
    if (row)
      row.forEach((cell, x) => {
        if (!cell) return;
        const p = document.createElement('div');
        p.className = 'ref';
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
  const button = document.getElementById('send');
  button?.parentNode?.removeChild(button);
  button?.classList.remove('off');
  const requestPopup = document.createElement('div');
  requestPopup.className = 'megaphone pvs';
  requestPopup.appendChild(
    document.createTextNode('Swarmation is extra fun with more people. Ask some friends to join: ')
  );
  requestPopup.appendChild(button);
  document.getElementById('container')?.appendChild(requestPopup);
  requestPopupShown = true;
}

socket.on('nextFormation', (message: NextFormationMessage) => {
  document.getElementById('formation-name')?.textContent = message.formation;
  showFormation(message.map);

  time = message.time;
  document.getElementById('countdown')?.textContent = time + '';

  if (formationInterval) clearInterval(formationInterval);
  formationInterval = setInterval(() => {
    time--;
    document.getElementById('countdown').textContent = time + '';
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
  const button = document.getElementById('send');
  button?.parentNode?.removeChild(button);
  button?.classList.remove('off');
  const t = new Date();
  const d = nextWeeklyGame;
  const isToday =
    t.getFullYear() === d.getFullYear() &&
    t.getMonth() === d.getMonth() &&
    t.getDate() === d.getDate();
  const weeklyGameNotice = document.createElement('div');
  weeklyGameNotice.className = 'megaphone pvs';
  weeklyGameNotice.innerHTML = `
    ${
      isToday
        ? `Join us this TODAY – ${monthNames[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} – at `
        : `Join us this ${dayNames[d.getDay()]} – ${
            monthNames[d.getMonth()]
          } ${d.getDate()}, ${d.getFullYear()} – at `
    }
    <a href="http://erthbeet.com/?Universal_World_Time=kv2300">${
      twelveHours(d.getHours()) + ampm(d.getHours())
    }</a>
    for a big game of Swarmation!
  `;
  document.getElementById('container')?.appendChild(weeklyGameNotice);
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
  for (const id in PLAYERS) PLAYERS[id].el.parentNode?.removeChild(PLAYERS[id].el);
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
  const login = document.getElementById('login');
  const username = document.createElement('div');
  username.className = 'top-border pvm phm light';
  username.textContent = `Welcome, ${name}`;
  const parent = login.parentNode;
  parent?.removeChild(login);
  parent.appendChild(username);
  socket.emit('login', {token, userId, name});
  PLAYER.name = name;
  PLAYER.loggedIn = true;
  PLAYER.sendInfo(true);
}
