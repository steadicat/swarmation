import 'core-js/es/array/filter';
import 'core-js/es/array/index-of';
import 'core-js/es/array/is-array';
import 'core-js/es/function/bind';
import 'core-js/es/string/trim';

import * as io from 'socket.io-client';
import {clientEmit, clientListen} from '../protocol';
import {Player} from '../player';
import {positionWelcome, showWelcome, startCountdown, hideWelcome} from './welcome';
import {showTooltip, hideTooltip} from './tooltip';
import {initializeControls} from './controls';
import * as map from '../map';

const WIDTH = 84;
const HEIGHT = 60;
const MIN_ACTIVE = 6;

let PLAYERS: {[id: string]: Player | undefined} = {};
let SELF: Player | null = null;
const ELEMENTS: {[id: string]: HTMLElement | undefined} = {};

let socket = io.connect('');

let RESTARTING = false;

function displayMessage(text: string) {
  hideWelcome();
  const message = document.createElement('div');
  message.className = 'message';
  message.innerText = text;
  document.getElementById('board-container')?.appendChild(message);
}

function successRate({total, succeeded}: Player) {
  if (total === 0) return 100;
  return Math.round((1000.0 * succeeded) / total) / 10;
}

function getX({left}: Player) {
  return left * 10 + 1;
}

function getY({top}: Player) {
  return top * 10 + 1;
}

function getScreenPosition(player: Player) {
  const board = document.getElementById('board');
  if (!board) throw new Error('Element #board not found');
  const {left, top} = board.getBoundingClientRect();
  return [getX(player) + left + window.pageXOffset, getY(player) + top + window.pageYOffset] as [
    number,
    number
  ];
}

function animate(duration: number, start: () => void, end: () => void) {
  setTimeout(() => {
    start();
    if (end) setTimeout(end, duration);
  }, 0);
}

function scoreChange(delta: number) {
  if (!SELF) throw new Error('Local player object not found');
  const score = document.getElementById('score');
  if (!score) throw new Error('#score element not found');
  const success = document.getElementById('success');
  if (!success) throw new Error('#success element not found');
  score.textContent = `${SELF.score}`;
  success.textContent = `${successRate(SELF)}`;
  const popup = document.createElement('div');
  popup.className = `score abs center ${delta > 0 ? 'positive' : 'negative'}`;
  popup.innerText = (delta > 0 ? '+' : '') + delta;
  const el = ELEMENTS[SELF.id];
  if (!el) throw new Error('Element for player not found');
  const [left, top] = getScreenPosition(SELF);
  popup.style.left = left - 200 + 'px';
  popup.style.top = top - 50 + 'px';
  document.body.appendChild(popup);
  animate(
    600,
    () => popup.classList.add('scale'),
    () => popup.parentNode?.removeChild(popup)
  );
}

function setPosition(player: Player, left: number, top: number): boolean {
  // cancel in case of collisions
  if (map.exists(left, top)) return false;
  // cancel if out of bounds
  if (left < 0 || left >= WIDTH) return false;
  if (top < 0 || top >= HEIGHT) return false;

  map.move(player.left, player.top, left, top, player);
  player.left = left;
  player.top = top;

  const el = ELEMENTS[player.id];
  if (!el) throw new Error('Element for player not found');
  el.style.left = getX(player) + 'px';
  el.style.top = getY(player) + 'px';

  return true;
}

function initializePlayer(player: Player) {
  let el = ELEMENTS[player.id];
  if (!el) {
    el = ELEMENTS[player.id] = document.createElement('div');
    el.className = 'player';
    const board = document.getElementById('board');
    if (!board) throw new Error('Element #board not found');
    board.appendChild(el);
  }
  setPosition(player, player.left, player.top);

  el.addEventListener('mouseover', () => {
    showTooltip(player, getScreenPosition(player));
  });
  el.addEventListener('mouseout', () => hideTooltip());
  return el;
}

function formationDeadline(player: Player, success: boolean, gain: number, loss: number) {
  player.total++;
  if (success) {
    const el = ELEMENTS[player.id];
    if (!el) throw new Error('Element for player not found');
    el.classList.add('active');
    setTimeout(() => {
      el.classList.remove('active');
    }, 1000);
    player.score += gain;
    player.succeeded++;
    if (player === SELF) scoreChange(+gain);
    el.classList.remove('idle');
  } else {
    player.score = Math.max(0, player.score - loss);
    if (player === SELF) scoreChange(-loss);
  }
}

// sockets

function contains<T>(el: T, list: T[]): boolean {
  return list.indexOf(el) >= 0;
}

function showFormation(formationMap: boolean[][]) {
  const formationImage = document.getElementById('formation-image');
  if (!formationImage) throw new Error('#formation-image element not found');
  formationImage.innerHTML = '';
  let width = 0;
  let height = 0;

  for (const [y, row] of Object.entries(formationMap)) {
    if (!row) continue;
    for (const [x, cell] of Object.entries(row)) {
      if (!cell) continue;
      const p = document.createElement('div');
      p.className = 'ref';
      formationImage.appendChild(p);
      p.style.top = Number(y) * (p.offsetHeight + 1) + 'px';
      p.style.left = Number(x) * (p.offsetWidth + 1) + 'px';
      width = Math.max(width, Number(x) * (p.offsetWidth + 1) + p.offsetWidth);
      height = Math.max(height, Number(y) * (p.offsetHeight + 1) + p.offsetHeight);
    }
  }

  formationImage.style.width = width + 'px';
  formationImage.style.top = 50 - height / 2 + 'px';
}

let time: number;
let formationInterval: NodeJS.Timer;

let saveData;
try {
  saveData = localStorage.getItem('save');
} catch {
  console.log('Error reading from localStorage');
}
if (saveData) {
  clientEmit(socket, {type: 'restore', data: saveData});
}

let latestTimestamp = 0;

clientListen(socket, (message) => {
  // console.debug(message);
  switch (message.type) {
    case 'welcome': {
      for (const player of message.players) {
        PLAYERS[player.id] = player;
        initializePlayer(player);
      }
      const self = (SELF = PLAYERS[message.id] || null);
      if (!self) throw new Error('Local player object not found');
      const el = ELEMENTS[message.id];
      if (!el) throw new Error('Local player element not found');
      el.classList.add('self');
      showWelcome();
      positionWelcome(getScreenPosition(self));

      initializeControls(self, {
        move(left, top) {
          const changed = setPosition(self, left, top);
          if (!changed) return;
          latestTimestamp = Date.now();
          clientEmit(socket, {type: 'position', left, top, time: latestTimestamp});
          el.classList.remove('idle');
          startCountdown();
          positionWelcome(getScreenPosition(self));
        },
        startFlash() {
          el.classList.add('flash');
          clientEmit(socket, {type: 'flash'});
        },
        stopFlash() {
          el.classList.remove('flash');
          clientEmit(socket, {type: 'flash', stop: true});
        },
        lockIn() {
          if (self.lockedIn) return;
          self.lockedIn = true;
          el.classList.add('locked-in');
          clientEmit(socket, {type: 'lockIn'});
        },
      });
      break;
    }

    case 'player': {
      if (!PLAYERS[message.player.id]) {
        PLAYERS[message.player.id] = message.player;
      } else {
        Object.assign(PLAYERS[message.player.id], message.player);
      }
      initializePlayer(message.player);
      break;
    }

    case 'position': {
      const player = PLAYERS[message.id];
      if (!player) throw new Error('Player not found');
      if (player === SELF && message.time !== latestTimestamp) {
        // Discard stale self moves
        break;
      }
      setPosition(player, message.left, message.top);
      break;
    }

    case 'flash': {
      const {id, stop} = message;
      const player = PLAYERS[id];
      if (!player) throw new Error('Player not found');
      if (stop) {
        ELEMENTS[player.id]?.classList.remove('flash');
      } else {
        ELEMENTS[player.id]?.classList.add('flash');
      }
      break;
    }

    case 'lockIn': {
      const {id} = message;
      const player = PLAYERS[id];
      if (!player) throw new Error('Player not found');
      if (player.lockedIn) break;
      player.lockedIn = true;
      ELEMENTS[player.id]?.classList.add('locked-in');
      break;
    }

    case 'idle': {
      const el = ELEMENTS[message.id];
      if (!el) throw new Error('Element for player not found');
      el.classList.add('idle');
      break;
    }

    case 'disconnected': {
      const p = PLAYERS[message.id];
      if (!p || !p.left || !p.top) return;
      map.unset(p.left, p.top);
      const el = ELEMENTS[message.id];
      if (!el) throw new Error('Element for player not found');
      el.parentNode?.removeChild(el);
      delete PLAYERS[message.id];
      break;
    }

    case 'formation': {
      if (!SELF) throw new Error('Local player object not found');
      formationDeadline(SELF, contains(SELF.id, message.ids), message.gain, message.loss);
      for (const id in PLAYERS) {
        const player = PLAYERS[id];
        if (!player) throw new Error('Player object not found');
        formationDeadline(player, contains(id, message.ids), message.gain, message.loss);
        if (player.lockedIn) {
          ELEMENTS[player.id]?.classList.remove('locked-in');
          player.lockedIn = false;
        }
      }
      try {
        localStorage.setItem('save', message.save);
      } catch {
        console.log('Error writing to localStorage');
      }
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

      if (message.active < MIN_ACTIVE) {
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

    default:
      // @ts-ignore
      throw new Error(`Message type ${message.type} not implemented`);
  }
});

socket.on('connect', () => {
  for (const element of Object.values(ELEMENTS)) {
    if (!element) continue;
    element.parentNode?.removeChild(element);
  }
  PLAYERS = {};
  map.clear();
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
