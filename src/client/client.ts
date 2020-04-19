import 'core-js/es/array/find';
import 'core-js/es/array/find-index';
import 'core-js/es/string/trim';

import * as io from 'socket.io-client';
import {clientEmit, clientListen} from '../protocol';
import {Player} from '../player';
import {initializeControls} from './controls';
import * as map from '../map';

const MIN_ACTIVE = 6;

let PLAYERS: {[id: string]: Player | undefined} = {};
let SELF: Player | null = null;

let socket = io.connect('');

let RESTARTING = false;

import Info from './Info.svelte';
import Board from './Board.svelte';

const info = new Info({target: document.getElementById('info')!});
const board = new Board({target: document.getElementById('board')!});

function displayMessage(text: string) {
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
  info.$set({score: SELF.score, successRate: successRate(SELF)});
  const popup = document.createElement('div');
  popup.className = `score abs center ${delta > 0 ? 'positive' : 'negative'}`;
  popup.innerText = (delta > 0 ? '+' : '') + delta;
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

function setPosition(player: Player, left: number, top: number) {
  if (map.get(player.left, player.top) === player) {
    map.unset(player.left, player.top);
  }
  if (map.get(left, top) === player) return;
  map.set(left, top, player);
  player.left = left;
  player.top = top;
}

// sockets

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
        map.set(player.left, player.top, player);
        if (player === SELF) {
          info.$set({score: SELF.score, successRate: successRate(SELF)});
        }
      }
      const self = (SELF = PLAYERS[message.id] || null);
      if (!self) throw new Error('Local player object not found');

      board.$set({players: Object.values(PLAYERS), selfId: self.id});

      initializeControls(self, {
        move(direction, left, top) {
          self.active = true;
          if (!map.isValidMove(self.left, self.top, left, top, self)) return;
          setPosition(self, left, top);
          latestTimestamp = Date.now();
          clientEmit(socket, {type: 'move', direction, time: latestTimestamp});
          board.$set({players: Object.values(PLAYERS), hasMoved: true});
        },
        startFlash() {
          self.flashing = true;
          clientEmit(socket, {type: 'flash'});
          board.$set({players: Object.values(PLAYERS)});
        },
        stopFlash() {
          self.flashing = false;
          clientEmit(socket, {type: 'flash', stop: true});
          board.$set({players: Object.values(PLAYERS)});
        },
        lockIn() {
          if (self.lockedIn) return;
          self.lockedIn = true;
          clientEmit(socket, {type: 'lockIn'});
          board.$set({players: Object.values(PLAYERS)});
        },
      });
      break;
    }

    case 'player': {
      let player = PLAYERS[message.player.id];
      if (!player) {
        player = PLAYERS[message.player.id] = message.player;
      } else {
        map.unset(player.left, player.top);
        Object.assign(player, message.player);
      }
      map.set(player.left, player.top, player);
      if (player === SELF) {
        info.$set({score: SELF.score, successRate: successRate(SELF)});
      }
      board.$set({players: Object.values(PLAYERS)});
      break;
    }

    case 'position': {
      const player = PLAYERS[message.id];
      if (!player) throw new Error('Player not found');
      if (player === SELF && message.time !== latestTimestamp) {
        // Discard stale self moves
        break;
      }
      player.active = true;
      setPosition(player, message.left, message.top);
      board.$set({players: Object.values(PLAYERS)});
      break;
    }

    case 'flash': {
      const {id, stop} = message;
      const player = PLAYERS[id];
      if (!player) throw new Error('Player not found');
      player.flashing = !stop;
      board.$set({players: Object.values(PLAYERS)});
      break;
    }

    case 'lockIn': {
      const {id} = message;
      const player = PLAYERS[id];
      if (!player) throw new Error('Player not found');
      if (player.lockedIn) break;
      player.lockedIn = true;
      board.$set({players: Object.values(PLAYERS)});
      break;
    }

    case 'idle': {
      const player = PLAYERS[message.id];
      if (!player) throw new Error('Player not found');
      player.active = false;
      board.$set({players: Object.values(PLAYERS)});
      break;
    }

    case 'disconnected': {
      const p = PLAYERS[message.id];
      if (!p || !p.left || !p.top) return;
      map.unset(p.left, p.top);
      delete PLAYERS[message.id];
      board.$set({players: Object.values(PLAYERS)});
      break;
    }

    case 'formation': {
      const {gain, loss} = message;
      for (const id in PLAYERS) {
        const player = PLAYERS[id];
        if (!player) throw new Error('Player object not found');
        const success = message.ids.indexOf(id) >= 0;
        player.total++;
        player.lockedIn = false;
        if (success) {
          player.score += gain;
          player.succeeded++;
          if (player === SELF) scoreChange(+gain);
          player.active = true;
        } else {
          player.score = Math.max(0, player.score - loss);
          if (player === SELF) scoreChange(-loss);
        }
      }
      board.$set({players: Object.values(PLAYERS), activeIds: message.ids});
      setTimeout(() => {
        board.$set({activeIds: []});
      }, 1000);

      try {
        localStorage.setItem('save', message.save);
      } catch {
        console.log('Error writing to localStorage');
      }
      break;
    }

    case 'nextFormation': {
      time = message.time;
      info.$set({
        countdown: time,
        formationName: message.formation,
        formationMap: message.map,
      });

      if (formationInterval) clearInterval(formationInterval);
      formationInterval = setInterval(() => {
        time--;
        info.$set({countdown: time});
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
      // @ts-expect-error
      throw new Error(`Message type ${message.type} not implemented`);
  }
});

socket.on('connect', () => {
  PLAYERS = {};
  map.clear();
  board.$set({players: Object.values(PLAYERS)});
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
