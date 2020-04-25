import 'core-js/es/array/find';
import 'core-js/es/array/find-index';

import * as map from '../map';
import {clientSend, clientListen, MessageType} from '../protocol';
import {initializeControls} from './controls';
import {directions} from './directions';

import Game from './Game.svelte';
import type {GameProps} from './Game.svelte';

const state: GameProps = {
  players: [],
  self: null,

  formation: {time: 0, name: '\xa0', map: []},
  activeIds: [],
  scoreChanges: [],

  hasMoved: false,
  connected: false,
  kickedOut: false,
  message: null,
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

  let saveData = null;
  try {
    saveData = localStorage.getItem('save');
  } catch {
    console.log('Error reading from localStorage');
  }
  if (saveData !== null) {
    clientSend(ws, {type: MessageType.Restore, data: saveData});
  }

  let latestTimestamp = 0;

  clientListen(ws, (message) => {
    // console.debug(message);
    switch (message.type) {
      case MessageType.Welcome: {
        state.players = message.players;
        for (const player of message.players) {
          map.set(player.left, player.top, player);
        }
        const self = (state.self = state.players.find(({id}) => id === message.id) || null);
        if (!self) throw new Error('Local player object not found');

        initializeControls(self, {
          move(direction) {
            self.active = true;
            const [left, top] = directions[direction](self.left, self.top);
            if (!map.isValidMove(self.left, self.top, left, top)) return;
            setPosition(self, left, top);
            latestTimestamp = Date.now();
            state.hasMoved = true;
            const time = (latestTimestamp = Date.now());
            clientSend(ws, {type: MessageType.Move, direction, time});
          },
          startFlash() {
            self.flashing = true;
            clientSend(ws, {type: MessageType.Flash});
          },
          stopFlash() {
            self.flashing = false;
            clientSend(ws, {type: MessageType.Flash, stop: true});
          },
          lockIn() {
            if (self.lockedIn) return;
            self.lockedIn = true;
            clientSend(ws, {type: MessageType.LockIn});
          },
        });
        break;
      }

      case MessageType.Player: {
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

      case MessageType.Position: {
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

      case MessageType.Flash: {
        const player = state.players.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        player.flashing = !message.stop;
        break;
      }

      case MessageType.LockIn: {
        const player = state.players.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        if (player.lockedIn) break;
        player.lockedIn = true;
        break;
      }

      case MessageType.Idle: {
        const player = state.players.find(({id}) => id == message.id);
        if (!player) throw new Error('Player not found');
        player.active = false;
        break;
      }

      case MessageType.Disconnected: {
        const index = state.players.findIndex(({id}) => id == message.id);
        const player = state.players[index];
        map.unset(player.left, player.top);
        state.players.splice(index, 1);
        break;
      }

      case MessageType.Formation: {
        const {gain, loss, ids} = message;
        for (const player of state.players) {
          const success = ids.indexOf(player.id) >= 0;
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

      case MessageType.NextFormation: {
        const {time, formation, map} = message;
        state.formation = {time, name: formation, map};
        break;
      }

      case MessageType.Restart: {
        state.kickedOut = true;
        ws.close();
        state.message = 'Swarmation needs to restart for an update. Please reload the page.';
        break;
      }

      case MessageType.Kick: {
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
