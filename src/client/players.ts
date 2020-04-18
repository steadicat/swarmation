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
import {clientEmit, clientListen, PositionMessage, ScoreMessage} from '../protocol';
let socket = io.connect('');

let RESTARTING = false;

function displayMessage(text: string) {
  PLAYER && PLAYER.hideWelcome();
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
  if (!PLAYER) throw new Error('Player object not found');
  const score = document.getElementById('score');
  if (!score) throw new Error('#score element not found');
  const success = document.getElementById('success');
  if (!success) throw new Error('#success element not found');
  score.textContent = `${PLAYER.score}`;
  success.textContent = `${PLAYER.successRate()}`;
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
  moveIntervals: {[key in Direction]?: number} = {};
  name: string;
  left: number | null = null;
  top: number | null = null;

  welcomeCountdown = 20;
  welcome?: HTMLDivElement;
  tooltip?: HTMLDivElement;

  constructor(id: string, left: number | null, top: number | null, isSelf = false) {
    this.id = id;
    this.el = document.createElement('div');
    this.el.className = 'player';
    document.getElementById('board')?.appendChild(this.el);
    if (!left || !top) {
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
      this.sendPosition();
      let progress;
      try {
        progress = localStorage.getItem('progress');
      } catch {
        console.log('Error reading from localStorage');
      }
      if (progress) {
        clientEmit(socket, {type: 'progress', progress});
      }
    }
    this.el.addEventListener('mouseover', this.showTooltip.bind(this));
    this.el.addEventListener('mouseout', this.hideTooltip.bind(this));
  }

  static atPixel(x: number, y: number): Player | null {
    return Player.atPosition(Player.getLeft(x), Player.getTop(y));
  }

  static atPosition(left: number, top: number): Player | null {
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
    if (this.left === null) throw new Error('Player not positioned');
    return this.left * 10 + 1;
  }
  getY(): number {
    if (this.top === null) throw new Error('Player not positioned');
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

    if (this.left && this.top) {
      if (!MAP[this.left]) MAP[this.left] = [];
      MAP[this.left][this.top] = null;
    }
    this.left = left;
    this.top = top;
    if (!MAP[left]) MAP[left] = [];
    MAP[left][top] = this;

    this.el.style.left = this.getX() + 'px';
    this.el.style.top = this.getY() + 'px';

    if (this.welcome) {
      this.welcome.innerHTML = `
      <p>Get into a formation with other players before the countdown expires</p>
    `;
      this.welcomeCountdown--;
      if (this.welcomeCountdown === 0) {
        this.hideWelcome();
      }
      setTimeout(this.hideWelcome.bind(this), 10000);
      this.positionWelcome(this.welcome);
    }

    return true;
  }

  move(direction: Direction) {
    if (this.lockedIn) return;
    if (this.left === null) throw new Error('Player not positioned');
    if (this.top === null) throw new Error('Player not positioned');
    const newp = Player.directions[direction](this.left, this.top);
    const changed = this.setPosition(newp[0], newp[1]);
    if (changed) {
      this.sendPosition();
      this.el.classList.remove('idle');
    }
  }

  startMove(direction: Direction) {
    if (this.moveIntervals[direction]) return;
    this.move(direction);
    this.moveIntervals[direction] = window.setInterval(() => {
      this.move(direction);
    }, MOVEMENT_RATE);
  }

  stopMove(direction: Direction) {
    if (this.moveIntervals[direction]) {
      clearInterval(this.moveIntervals[direction]);
      this.moveIntervals[direction] = undefined;
    }
  }

  startFlash() {
    this.el.classList.add('flash');
    if (this.isSelf) clientEmit(socket, {type: 'flash'});
  }

  stopFlash() {
    this.el.classList.remove('flash');
    if (this.isSelf) clientEmit(socket, {type: 'flash', stop: true});
  }

  startLockIn() {
    if (this.lockedIn) return;
    this.el.classList.add('locked-in');
    this.lockedIn = true;
    if (this.isSelf) clientEmit(socket, {type: 'lockIn'});
  }

  stopLockIn() {
    if (!this.lockedIn) return;
    this.el.classList.remove('locked-in');
    this.lockedIn = false;
    if (this.isSelf) clientEmit(socket, {type: 'lockIn', stop: true});
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

  sendPosition() {
    if (this.left === null) throw new Error('Player not positioned');
    if (this.top === null) throw new Error('Player not positioned');
    this.latestTimestamp = Date.now();
    clientEmit(socket, {
      type: 'position',
      left: this.left,
      top: this.top,
      time: this.latestTimestamp,
    });
  }

  getPosition(message: Omit<PositionMessage, 'type'>) {
    if (message.left && (!this.isSelf || message.time === this.latestTimestamp)) {
      this.setPosition(message.left, message.top);
    }
  }

  getScore({score, total, succeeded}: ScoreMessage) {
    if (score) this.score = score;
    if (total) this.total = total;
    if (succeeded) this.succeeded = succeeded;
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
    this.welcomeCountdown = 20;
    welcome.style.opacity = '0';
    setTimeout(() => {
      welcome.classList.add('fade');
      welcome.style.opacity = '1';
    }, 100);
    this.positionWelcome(welcome);
  }

  hideWelcome() {
    if (!this.welcome) return;
    this.welcome.style.opacity = '0';
    setTimeout(() => {
      if (!this.welcome) return;
      this.welcome.parentNode?.removeChild(this.welcome);
      this.welcomeCountdown = 20;
      delete this.welcome;
    }, 1000);
  }

  positionWelcome(welcome: HTMLElement) {
    welcome.style.left = this.getScreenLeft() - welcome.offsetWidth / 2 + 5 + 'px';
    welcome.style.top = this.getScreenTop() - welcome.offsetHeight - 15 + 'px';
  }
}

// sockets

export function start() {
  // no-op, called to trigger evaluation of the module
}

function loadPlayerScore(message: ScoreMessage & {id: string}) {
  const {id} = message;
  if (!PLAYERS[id]) {
    PLAYERS[id] = new Player(id, null, null);
  }
  PLAYERS[id].getScore(message);
}

function loadPlayerPosition({id, left, top, time}: PositionMessage & {id: string}) {
  if (!PLAYERS[id]) {
    PLAYERS[id] = new Player(id, left, top);
  }
  PLAYERS[id].getPosition({left, top, time});
}

function contains<T>(el: T, list: T[]): boolean {
  return list.indexOf(el) >= 0;
}

function showFormation(map: boolean[][]) {
  const formationImage = document.getElementById('formation-image');
  if (!formationImage) throw new Error('#formation-image element not found');
  formationImage.innerHTML = '';
  let width = 0;
  let height = 0;
  map.forEach((row, y) => {
    if (row)
      row.forEach((cell, x) => {
        if (!cell) return;
        const p = document.createElement('div');
        p.className = 'ref';
        formationImage.appendChild(p);
        p.style.top = y * (p.offsetHeight + 1) + 'px';
        p.style.left = x * (p.offsetWidth + 1) + 'px';
        width = Math.max(width, x * (p.offsetWidth + 1) + p.offsetWidth);
        height = Math.max(height, y * (p.offsetHeight + 1) + p.offsetHeight);
      });
  });
  formationImage.style.width = width + 'px';
  formationImage.style.top = 50 - height / 2 + 'px';
}

let time: number;
let formationInterval: NodeJS.Timer;

let requestPopupShown = false;

clientListen(socket, (message) => {
  switch (message.type) {
    case 'welcome': {
      for (const id in message.scores) loadPlayerScore(message.scores[id]);
      for (const id in message.positions) loadPlayerPosition(message.positions[id]);
      if (PLAYER) {
        PLAYER.id = message.id;
      } else {
        PLAYER = new Player(message.id, null, null, true);
        PLAYER?.showWelcome();
      }
      break;
    }

    case 'position': {
      if (PLAYER && message.id === PLAYER.id) {
        PLAYER.getPosition(message);
      } else {
        loadPlayerPosition(message);
      }

      break;
    }

    case 'score': {
      if (PLAYER && message.id === PLAYER.id) {
        PLAYER.getScore(message);
        const score = document.getElementById('score');
        if (score && message.score) score.textContent = message.score + '';
      } else {
        loadPlayerScore(message);
      }

      break;
    }

    case 'progress': {
      try {
        localStorage.setItem('progress', message.progress);
      } catch {
        console.log('Error writing to localStorage');
      }
      break;
    }

    case 'flash': {
      const {id, stop} = message;
      if (PLAYERS[id]) {
        if (stop) {
          PLAYERS[id].stopFlash();
        } else {
          PLAYERS[id].startFlash();
        }
      }
      break;
    }

    case 'lockIn': {
      if (PLAYERS[message.id]) {
        if (message.stop) {
          PLAYERS[message.id].stopLockIn();
        } else {
          PLAYERS[message.id].startLockIn();
        }
      }
      break;
    }

    case 'idle': {
      if (PLAYERS[message.id]) PLAYERS[message.id].el.classList.add('idle');
      if (PLAYER && message.id === PLAYER.id) PLAYER.el.classList.add('idle');
      break;
    }

    case 'disconnected': {
      const p = PLAYERS[message.id];
      if (!p || !p.left || !p.top) return;
      delete MAP[p.left][p.top];
      PLAYERS[message.id].el.parentNode?.removeChild(PLAYERS[message.id].el);
      delete PLAYERS[message.id];
      break;
    }

    case 'formation': {
      if (!PLAYER || !PLAYER.id) return;
      PLAYER.formationDeadline(contains(PLAYER.id, message.ids), message.gain, message.loss);
      for (const id in PLAYERS) {
        const player = PLAYERS[id];
        player.formationDeadline(contains(id, message.ids), message.gain, message.loss);
        player.stopLockIn();
      }
      PLAYER.stopLockIn();
      break;
    }

    case 'nextFormation': {
      const formationName = document.getElementById('formation-name');
      if (!formationName) throw new Error('#formation-name element not found');
      const countdown = document.getElementById('countdown');
      if (!countdown) throw new Error('#countdown element not found');
      formationName.textContent = message.formation;
      showFormation(message.map);

      time = message.time;
      countdown.textContent = time + '';

      if (formationInterval) clearInterval(formationInterval);
      formationInterval = setInterval(() => {
        time--;
        countdown.textContent = time + '';
        if (time === 0) clearInterval(formationInterval);
      }, 1000);

      if (PLAYER && PLAYER.loggedIn && message.active < MIN_ACTIVE) {
        // TODO
        // if (!weeklyGameNoticeShown) showRequestPopup();
      }
      break;
    }

    case 'restart': {
      RESTARTING = true;
      socket.disconnect();
      displayMessage('Swarmation needs to restart for an update. Please reload the page.');
      break;
    }

    case 'kick': {
      RESTARTING = true;
      socket.disconnect();
      displayMessage(
        'You have been disconnected for being idle too long. Reload the page to resume playing.'
      );
      break;
    }

    // default:
    //   throw new Error(`Message type ${message.type} not implemented`);
  }
});

socket.on('connect', () => {
  if (PLAYER) PLAYER.sendPosition();
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

// TODO
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showRequestPopup() {
  if (requestPopupShown) return;
  const requestPopup = document.createElement('div');
  requestPopup.className = 'megaphone pvs';
  requestPopup.appendChild(
    document.createTextNode('Swarmation is extra fun with more people. Ask some friends to join: ')
  );
  document.getElementById('container')?.appendChild(requestPopup);
  requestPopupShown = true;
}

const MOVEMENTS = {
  '38': 'up' as 'up',
  '40': 'down' as 'down',
  '37': 'left' as 'left',
  '39': 'right' as 'right',
};

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (!PLAYER) return;

  const keyCode = (event.keyCode + '') as keyof typeof MOVEMENTS;
  if (MOVEMENTS[keyCode]) {
    PLAYER.startMove(MOVEMENTS[keyCode]);
    event.preventDefault();
  } else if (event.keyCode === 32) {
    // space
    PLAYER.startFlash();
    event.preventDefault();
  } else if (event.keyCode === 83) {
    // "s"
    PLAYER.startLockIn();
    event.preventDefault();
  }
});

document.addEventListener('keyup', (event: KeyboardEvent) => {
  if (!PLAYER) return;

  const keyCode = (event.keyCode + '') as keyof typeof MOVEMENTS;
  if (MOVEMENTS[keyCode]) {
    PLAYER.stopMove(MOVEMENTS[keyCode]);
    event.preventDefault();
  } else if (event.keyCode === 32) {
    // space
    PLAYER.stopFlash();
    event.preventDefault();
  }
});
