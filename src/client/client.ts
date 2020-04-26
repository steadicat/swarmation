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

  formation: {time: -1, name: '\xa0', map: []},
  activeIds: [],
  scoreChanges: [],

  hasMoved: false,
  kickedOut: false,
  message: null,
};

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

const websocketURL = `${location.protocol.replace('http', 'ws')}//${location.host}/ws`;

function connect() {
  const ws = new WebSocket(websocketURL);

  ws.addEventListener('open', () => {
    console.log(`Connected`);
    state.players = [];
    map.clear();

    let saveData = null;
    try {
      saveData = localStorage.getItem('save');
    } catch {
      console.log(`Error reading from localStorage`);
    }
    if (saveData !== null) {
      clientSend(ws, [MessageType.Restore, saveData]);
    }

    let latestTimestamp = 0;

    clientListen(ws, (message) => {
      switch (message[0]) {
        case MessageType.Welcome: {
          const [, id, players] = message;
          state.players = players;
          for (const player of players) {
            map.set(player.left, player.top, player);
          }
          const self = (state.self = state.players.find((player) => player.id === id) || null);
          if (!self) throw new Error(`Local player object not found`);

          initializeControls(self, {
            move(direction) {
              self.active = true;
              const [left, top] = directions[direction](self.left, self.top);
              if (!map.isValidMove(self.left, self.top, left, top)) return;
              setPosition(self, left, top);
              latestTimestamp = Date.now();
              state.hasMoved = true;
              const time = (latestTimestamp = Date.now());
              clientSend(ws, [MessageType.Move, direction, time]);
            },
            startFlash() {
              self.flashing = true;
              clientSend(ws, [MessageType.StartFlash]);
            },
            stopFlash() {
              self.flashing = false;
              clientSend(ws, [MessageType.StopFlash]);
            },
            lockIn() {
              if (self.lockedIn) return;
              self.lockedIn = true;
              clientSend(ws, [MessageType.LockIn]);
            },
          });
          break;
        }

        case MessageType.Player: {
          const [, newPlayer] = message;
          let player = state.players.find((player) => player.id == newPlayer.id);
          if (!player) {
            player = newPlayer;
            state.players.push(player);
          } else {
            map.unset(player.left, player.top);
            Object.assign(player, newPlayer);
          }
          map.set(player.left, player.top, player);
          break;
        }

        case MessageType.Position: {
          const [, id, left, top, time] = message;
          const player = state.players.find((player) => player.id == id);
          if (!player) throw new Error(`Player with ID ${id} not found`);
          if (player === state.self && time !== latestTimestamp) {
            // Discard stale self moves
            break;
          }
          player.active = true;
          setPosition(player, left, top);
          break;
        }

        case MessageType.StartFlash: {
          const [, id] = message;
          const player = state.players.find((player) => player.id == id);
          if (!player) throw new Error(`Player with ID ${id} not found`);
          player.flashing = true;
          break;
        }

        case MessageType.StopFlash: {
          const [, id] = message;
          const player = state.players.find((player) => player.id == id);
          if (!player) throw new Error('Player not found');
          player.flashing = false;
          break;
        }

        case MessageType.LockIn: {
          const [, id] = message;
          const player = state.players.find((player) => player.id == id);
          if (!player) throw new Error(`Player with ID ${id} not found`);
          if (player.lockedIn) break;
          player.lockedIn = true;
          break;
        }

        case MessageType.Idle: {
          const [, id] = message;
          const player = state.players.find((player) => player.id == id);
          if (!player) throw new Error(`Player with ID ${id} not found`);
          player.active = false;
          break;
        }

        case MessageType.Disconnected: {
          const [, id] = message;
          const index = state.players.findIndex((player) => player.id == id);
          const player = state.players[index];
          map.unset(player.left, player.top);
          state.players.splice(index, 1);
          break;
        }

        case MessageType.Formation: {
          const [, gain, loss, ids, save, name, time, map] = message;

          for (const player of state.players) {
            const success = ids.indexOf(player.id) >= 0;
            player.total++;
            player.lockedIn = false;
            if (success) {
              if (gain > 0) {
                player.score += gain;
                player.succeeded++;
                if (player === state.self) {
                  state.scoreChanges.push(gain);
                }
                player.active = true;
              }
            } else {
              if (loss < 0) {
                player.score = Math.max(0, player.score - loss);
                if (player === state.self) {
                  state.scoreChanges.push(-loss);
                }
              }
            }
          }

          const roundedTime = Math.floor(time);
          state.activeIds = ids;
          setTimeout(() => {
            state.activeIds = [];
            state.formation = {time: roundedTime, name, map};
          }, 1000 + (time - roundedTime));

          if (save !== null) {
            try {
              localStorage.setItem('save', save);
            } catch {
              console.log(`Error writing to localStorage`);
            }
          }
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
    console.log(`Disconnected`);
    if (state.kickedOut) return;
    setTimeout(() => {
      console.log(`Reconnecting...`);
      connect();
    }, 1000);
  }

  ws.addEventListener('close', onDisconnect);
}

connect();
