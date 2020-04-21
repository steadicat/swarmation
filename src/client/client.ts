import 'core-js/es/array/find';
import 'core-js/es/array/find-index';

import Bugsnag from '@bugsnag/js';

import * as map from '../map';
import {Player} from '../player';
import {clientSend, clientListen} from '../protocol';
import {initializeControls} from './controls';

import Game from './Game.svelte';

Bugsnag.start({
  apiKey: '598a6c87f69350bfffd18829c6e8a87c',
});

const MIN_ACTIVE = 6;

let PLAYERS: {[id: string]: Player | undefined} = {};
let SELF: Player | null = null;

const websocketURL = `${location.protocol.replace('http', 'ws')}//${location.host}`;
let ws = new WebSocket(websocketURL);

let RESTARTING = false;

const target = document.getElementById('game');
if (!target) throw new Error('Element #game not found');
const game = new Game({target});

function successRate({total, succeeded}: Player) {
  if (total === 0) return 100;
  return Math.round((1000.0 * succeeded) / total) / 10;
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

let connected = false;
ws.addEventListener('open', () => {
  connected = true;
  PLAYERS = {};
  map.clear();
  game.$set({players: Object.values(PLAYERS)});

  let time: number;
  let formationInterval: NodeJS.Timer;

  let saveData;
  try {
    saveData = localStorage.getItem('save');
  } catch {
    console.log('Error reading from localStorage');
  }
  if (saveData) {
    clientSend(ws, {type: 'restore', data: saveData});
  }

  let latestTimestamp = 0;
  const scoreChanges: number[] = [];

  clientListen(ws, (message) => {
    // console.debug(message);
    switch (message.type) {
      case 'welcome': {
        for (const player of message.players) {
          PLAYERS[player.id] = player;
          map.set(player.left, player.top, player);
          if (player === SELF) {
            game.$set({score: SELF.score, successRate: successRate(SELF)});
          }
        }
        const self = (SELF = PLAYERS[message.id] || null);
        if (!self) throw new Error('Local player object not found');

        game.$set({players: Object.values(PLAYERS), selfId: self.id});

        initializeControls(self, {
          move(direction, left, top) {
            self.active = true;
            if (!map.isValidMove(self.left, self.top, left, top, self)) return;
            setPosition(self, left, top);
            latestTimestamp = Date.now();
            clientSend(ws, {type: 'move', direction, time: latestTimestamp});
            game.$set({players: Object.values(PLAYERS), hasMoved: true});
          },
          startFlash() {
            self.flashing = true;
            clientSend(ws, {type: 'flash'});
            game.$set({players: Object.values(PLAYERS)});
          },
          stopFlash() {
            self.flashing = false;
            clientSend(ws, {type: 'flash', stop: true});
            game.$set({players: Object.values(PLAYERS)});
          },
          lockIn() {
            if (self.lockedIn) return;
            self.lockedIn = true;
            clientSend(ws, {type: 'lockIn'});
            game.$set({players: Object.values(PLAYERS)});
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
          game.$set({score: SELF.score, successRate: successRate(SELF)});
        }
        game.$set({players: Object.values(PLAYERS)});
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
        game.$set({players: Object.values(PLAYERS)});
        break;
      }

      case 'flash': {
        const {id, stop} = message;
        const player = PLAYERS[id];
        if (!player) throw new Error('Player not found');
        player.flashing = !stop;
        game.$set({players: Object.values(PLAYERS)});
        break;
      }

      case 'lockIn': {
        const {id} = message;
        const player = PLAYERS[id];
        if (!player) throw new Error('Player not found');
        if (player.lockedIn) break;
        player.lockedIn = true;
        game.$set({players: Object.values(PLAYERS)});
        break;
      }

      case 'idle': {
        const player = PLAYERS[message.id];
        if (!player) throw new Error('Player not found');
        player.active = false;
        game.$set({players: Object.values(PLAYERS)});
        break;
      }

      case 'disconnected': {
        const p = PLAYERS[message.id];
        if (!p || !p.left || !p.top) return;
        map.unset(p.left, p.top);
        delete PLAYERS[message.id];
        game.$set({players: Object.values(PLAYERS)});
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
            if (player === SELF) {
              scoreChanges.push(gain);
              game.$set({score: SELF.score, successRate: successRate(SELF), scoreChanges});
            }
            player.active = true;
          } else {
            player.score = Math.max(0, player.score - loss);
            if (player === SELF) {
              scoreChanges.push(-loss);
              game.$set({score: SELF.score, successRate: successRate(SELF), scoreChanges});
            }
          }
        }
        game.$set({players: Object.values(PLAYERS), activeIds: message.ids});
        setTimeout(() => {
          game.$set({activeIds: []});
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
        game.$set({
          countdown: time,
          formationName: message.formation,
          formationMap: message.map,
        });

        if (formationInterval) clearInterval(formationInterval);
        formationInterval = setInterval(() => {
          time--;
          game.$set({countdown: time});
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
        ws.close();
        game.$set({message: 'Swarmation needs to restart for an update. Please reload the page.'});
        break;
      }

      case 'kick': {
        RESTARTING = true;
        ws.close();
        game.$set({
          message:
            'You have been disconnected for being idle too long. Reload the page to resume playing.',
        });
        break;
      }

      default:
        throw new Error(
          `Message type ${
            // @ts-expect-error
            message.type
          } not implemented`
        );
    }
  });
});

ws.addEventListener('close', () => {
  connected = false;
  if (RESTARTING) return;
  // eslint-disable-next-line prefer-const
  let interval: NodeJS.Timer;
  function connect() {
    if (connected) {
      clearInterval(interval);
    } else {
      ws = new WebSocket(websocketURL);
    }
  }
  connect();
  interval = setInterval(connect, 2000);
});
