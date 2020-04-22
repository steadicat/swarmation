import 'core-js/es/array/find';
import 'core-js/es/array/find-index';

import * as map from '../map';
import {Player} from '../player';
import {clientSend, clientListen} from '../protocol';
import {initializeControls} from './controls';

import Game from './Game.svelte';

const MIN_ACTIVE = 6;

let PLAYERS: Player[] = [];
let SELF: Player | null = null;

const websocketURL = `${location.protocol.replace('http', 'ws')}//${location.host}`;
let ws = new WebSocket(websocketURL);

let connected = false;
let kickedOut = false;

const target = document.getElementById('game');
if (!target) throw new Error('Element #game not found');
const game = new Game({target});

function updateGame() {
  game.$set({players: PLAYERS});
  requestAnimationFrame(updateGame);
}

requestAnimationFrame(updateGame);

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

ws.addEventListener('open', () => {
  connected = true;
  PLAYERS = [];
  map.clear();

  let time: number;

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
        PLAYERS = message.players;
        for (const player of message.players) {
          map.set(player.left, player.top, player);
        }
        const self = (SELF = PLAYERS.find(({id}) => id === message.id) || null);
        if (!self) throw new Error('Local player object not found');

        game.$set({selfId: self.id});

        initializeControls(self, {
          move(direction, left, top) {
            self.active = true;
            if (!map.isValidMove(self.left, self.top, left, top, self)) return;
            setPosition(self, left, top);
            latestTimestamp = Date.now();
            clientSend(ws, {type: 'move', direction, time: latestTimestamp});
            game.$set({hasMoved: true});
          },
          startFlash() {
            self.flashing = true;
            clientSend(ws, {type: 'flash'});
          },
          stopFlash() {
            self.flashing = false;
            clientSend(ws, {type: 'flash', stop: true});
          },
          lockIn() {
            if (self.lockedIn) return;
            self.lockedIn = true;
            clientSend(ws, {type: 'lockIn'});
          },
        });
        break;
      }

      case 'player': {
        let player = PLAYERS.find(({id}) => id == message.player.id);
        if (!player) {
          player = message.player;
          PLAYERS.push(player);
        } else {
          map.unset(player.left, player.top);
          Object.assign(player, message.player);
        }
        map.set(player.left, player.top, player);
        break;
      }

      case 'position': {
        const player = PLAYERS.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        if (player === SELF && message.time !== latestTimestamp) {
          // Discard stale self moves
          break;
        }
        player.active = true;
        setPosition(player, message.left, message.top);
        break;
      }

      case 'flash': {
        const player = PLAYERS.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        player.flashing = !message.stop;
        break;
      }

      case 'lockIn': {
        const player = PLAYERS.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        if (player.lockedIn) break;
        player.lockedIn = true;
        break;
      }

      case 'idle': {
        const player = PLAYERS.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        player.active = false;
        break;
      }

      case 'disconnected': {
        const index = PLAYERS.findIndex(({id}) => id == message.id);
        const player = PLAYERS[index];
        map.unset(player.left, player.top);
        PLAYERS.splice(index, 1);
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
            }
            player.active = true;
          } else {
            player.score = Math.max(0, player.score - loss);
            if (player === SELF) {
              scoreChanges.push(-loss);
            }
          }
        }
        game.$set({activeIds: message.ids, scoreChanges});
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
        const {time, formation, map} = message;
        game.$set({formation: {time, name: formation, map}});

        if (message.active < MIN_ACTIVE) {
          // TODO
          // if (!weeklyGameNoticeShown) showRequestPopup();
        }
        break;
      }

      case 'restart': {
        kickedOut = true;
        ws.close();
        game.$set({message: 'Swarmation needs to restart for an update. Please reload the page.'});
        break;
      }

      case 'kick': {
        kickedOut = true;
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

function onDisconnect() {
  connected = false;
  if (kickedOut) return;
  function reconnect(delay: number) {
    ws = new WebSocket(websocketURL);
    setTimeout(() => {
      if (!connected) {
        ws.close();
        reconnect(delay * 2);
      }
    }, delay);
  }
  reconnect(1000);
}

ws.addEventListener('close', onDisconnect);
ws.addEventListener('error', onDisconnect);
