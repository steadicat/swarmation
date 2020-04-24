import 'core-js/es/array/find';
import 'core-js/es/array/find-index';

import * as map from '../map';
import {Player} from '../player';
import {clientSend, clientListen} from '../protocol';
import {initializeControls} from './controls';

import Game from './Game.svelte';

const state: GameProps = {
  players: [] as Player[],
  self: null as Player | null,

  formation: {time: 0, name: 'wait', map: [] as boolean[][]},
  activeIds: [] as string[],
  scoreChanges: [] as number[],

  hasMoved: false,
  connected: false,
  kickedOut: false,
  message: null as string | null,
};

const websocketURL = `${location.protocol.replace('http', 'ws')}//${location.host}`;
let ws = new WebSocket(websocketURL);

const target = document.getElementById('game');
if (!target) throw new Error('Element #game not found');
const game = new Game({target});

function updateGame() {
  game.$set(state);
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
  state.connected = true;
  state.players = [];
  map.clear();

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

  clientListen(ws, (message) => {
    // console.debug(message);
    switch (message.type) {
      case 'welcome': {
        state.players = message.players;
        for (const player of message.players) {
          map.set(player.left, player.top, player);
        }
        const self = (state.self = state.players.find(({id}) => id === message.id) || null);
        if (!self) throw new Error('Local player object not found');

        initializeControls(self, {
          move(direction, left, top) {
            self.active = true;
            if (!map.isValidMove(self.left, self.top, left, top, self)) return;
            setPosition(self, left, top);
            latestTimestamp = Date.now();
            state.hasMoved = true;
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
        let player = state.players.find(({id}) => id == message.player.id);
        if (!player) {
          player = message.player;
          state.players.push(player);
        } else {
          map.unset(player.left, player.top);
          Object.assign(player, message.player);
        }
        map.set(player.left, player.top, player);
        break;
      }

      case 'position': {
        const player = state.players.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        if (player === state.self && message.time !== latestTimestamp) {
          // Discard stale self moves
          break;
        }
        player.active = true;
        setPosition(player, message.left, message.top);
        break;
      }

      case 'flash': {
        const player = state.players.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        player.flashing = !message.stop;
        break;
      }

      case 'lockIn': {
        const player = state.players.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        if (player.lockedIn) break;
        player.lockedIn = true;
        break;
      }

      case 'idle': {
        const player = state.players.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        player.active = false;
        break;
      }

      case 'disconnected': {
        const index = state.players.findIndex(({id}) => id == message.id);
        const player = state.players[index];
        map.unset(player.left, player.top);
        state.players.splice(index, 1);
        break;
      }

      case 'formation': {
        const {gain, loss} = message;
        for (const id in state.players) {
          const player = state.players[id];
          if (!player) throw new Error('Player object not found');
          const success = message.ids.indexOf(id) >= 0;
          player.total++;
          player.lockedIn = false;
          if (success) {
            player.score += gain;
            player.succeeded++;
            if (player === state.self) {
              state.scoreChanges.push(gain);
            }
            player.active = true;
          } else {
            player.score = Math.max(0, player.score - loss);
            if (player === state.self) {
              state.scoreChanges.push(-loss);
            }
          }
        }
        state.activeIds = message.ids;
        setTimeout(() => {
          state.activeIds = [];
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
        state.formation = {time, name: formation, map};
        break;
      }

      case 'restart': {
        state.kickedOut = true;
        ws.close();
        state.message = 'Swarmation needs to restart for an update. Please reload the page.';
        break;
      }

      case 'kick': {
        state.kickedOut = true;
        ws.close();
        state.message =
          'You have been disconnected for being idle too long. Reload the page to resume playing.';
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
  state.connected = false;
  if (state.kickedOut) return;
  function reconnect(delay: number) {
    ws = new WebSocket(websocketURL);
    setTimeout(() => {
      if (!state.connected) {
        ws.close();
        reconnect(delay * 2);
      }
    }, delay);
  }
  reconnect(1000);
}

ws.addEventListener('close', onDisconnect);
ws.addEventListener('error', onDisconnect);
