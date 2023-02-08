import 'core-js/es/array/find';
import 'core-js/es/array/find-index';

import {clientSend, clientListen, MessageType} from '../protocol.js';
import {initializeControls} from './controls';
import {directions} from './directions.js';

import Game from './Game.svelte';
import {ComponentProps} from 'svelte';

let state: Readonly<ComponentProps<Game>> = {
  players: [],
  selfID: null,

  formation: {time: -1, name: '\xa0', map: []},
  activeIds: [],
  scoreChanges: [],

  hasMoved: false,
  message: null,
};

let kickedOut = false;

const target = document.getElementById('game');
if (!target) throw new Error('Element #game not found');
const game = new Game({target, props: state});

let updateScheduled = false;
function updateGame(props: Partial<ComponentProps<Game>>) {
  state = {...state, ...props};
  if (updateScheduled) return;
  updateScheduled = true;
  requestAnimationFrame(() => {
    updateScheduled = false;
    game.$set(state);
  });
}

function updatePlayer(id: number, change: Partial<Player>) {
  updateGame({
    players: state.players.map((player) => (player.id === id ? {...player, ...change} : player)),
  });
}

// sockets

const websocketURL = `${location.protocol.replace('http', 'ws')}//${SERVER}/ws`;

function connect() {
  const ws = new WebSocket(websocketURL);

  ws.addEventListener('open', () => {
    updateGame({players: []});

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
      // console.log(MessageType[message[0]], ...message.slice(1));
      switch (message[0]) {
        case MessageType.Welcome: {
          const [, selfID, initialPlayers, formationName, formationTime, formationMap] = message;
          // Set the time immediately to the rounded-up time
          const roundedTime = Math.ceil(formationTime);
          updateGame({
            players: initialPlayers,
            selfID,
            formation: {name: formationName, time: roundedTime, map: formationMap},
          });
          // Then schedule an update to align with the seconds tick
          setTimeout(() => {
            updateGame({
              formation: {name: formationName, time: roundedTime - 1, map: formationMap},
            });
          }, formationTime - (roundedTime - 1));

          initializeControls({
            move(direction) {
              const player = state.players.find((player) => player.id == selfID);
              if (!player) throw new Error('Cannot find self player');
              if (player.lockedIn) return;
              const [left, top] = directions[direction](player.left, player.top);
              // Collision detection
              if (state.players.some((player) => player.left === left && player.top === top)) {
                return;
              }
              updateGame({
                players: state.players.map((player) => {
                  if (player.id !== selfID) return player;
                  return {...player, left, top, active: true};
                }),
                hasMoved: true,
              });
              latestTimestamp = Date.now();
              const time = (latestTimestamp = Date.now());
              clientSend(ws, [MessageType.Move, direction, time]);
            },
            startFlash() {
              updatePlayer(selfID, {flashing: true, active: true});
              clientSend(ws, [MessageType.StartFlash]);
            },
            stopFlash() {
              updatePlayer(selfID, {flashing: false, active: true});
              clientSend(ws, [MessageType.StopFlash]);
            },
            lockIn() {
              updatePlayer(selfID, {lockedIn: true, active: true});
              clientSend(ws, [MessageType.LockIn]);
            },
          });
          break;
        }

        case MessageType.Player: {
          const [, newPlayer] = message;
          const player = state.players.find((player) => player.id == newPlayer.id);
          if (!player) {
            updateGame({players: [...state.players, newPlayer]});
          } else {
            updatePlayer(newPlayer.id, newPlayer);
          }
          break;
        }

        case MessageType.Position: {
          const [, id, left, top, time] = message;

          if (id === state.selfID && time !== latestTimestamp) {
            // Discard stale self moves
            break;
          }

          updatePlayer(id, {left, top, active: true});
          break;
        }

        case MessageType.StartFlash: {
          const [, id] = message;
          updatePlayer(id, {flashing: true, active: true});
          break;
        }

        case MessageType.StopFlash: {
          const [, id] = message;
          updatePlayer(id, {flashing: false, active: true});
          break;
        }

        case MessageType.LockIn: {
          const [, id] = message;
          updatePlayer(id, {lockedIn: true, active: true});
          break;
        }

        case MessageType.Idle: {
          const [, id] = message;
          updatePlayer(id, {active: false});
          break;
        }

        case MessageType.Disconnected: {
          const [, id] = message;
          updateGame({players: state.players.filter((player) => player.id !== id)});
          break;
        }

        case MessageType.Formation: {
          const [, gain, loss, ids, save, name, time, map] = message;

          let scoreChanges = state.scoreChanges;
          updateGame({
            players: state.players.map(({total, score, succeeded, active, ...player}) => {
              const success = ids.indexOf(player.id) >= 0;
              const scoreChange = success ? gain : -loss;

              if (player.id === state.selfID) scoreChanges = [...state.scoreChanges, scoreChange];
              return {
                ...player,
                total: total + 1,
                lockedIn: false,
                active: success ? true : active,
                score: Math.max(0, score + scoreChange),
                succeeded: succeeded + (success ? 1 : 0),
              };
            }),
            scoreChanges,
            activeIds: ids,
          });

          // Flash active players for 1s, then show the next formation
          setTimeout(() => {
            updateGame({
              activeIds: [],
              formation: {name, time, map},
            });
          }, 1000);

          try {
            localStorage.setItem('save', save);
          } catch {
            console.log(`Error writing to localStorage`);
          }
          break;
        }

        case MessageType.Restart: {
          ws.close();
          kickedOut = true;
          updateGame({
            message: 'Swarmation needs to restart for an update. Please reload the page.',
          });
          break;
        }

        case MessageType.Kick: {
          ws.close();
          kickedOut = true;
          updateGame({
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

  const unsubscribe = game.$on('subscribe', (event) => {
    clientSend(ws, [MessageType.Subscribe, event.detail]);
  });

  function onDisconnect() {
    unsubscribe();
    if (kickedOut) return;
    setTimeout(() => {
      connect();
    }, 1000);
  }

  ws.addEventListener('close', onDisconnect);
}

connect();
