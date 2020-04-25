import * as WebSocket from 'ws';

import {Direction} from '../client/directions';
import {clientSend, clientListen, MessageType} from '../protocol';

const [, , countS, websocketURL] = process.argv;

if (countS === undefined || websocketURL === undefined) {
  console.log('Usage: bots.ts [count] [websocket]');
  process.exit(1);
}

const count = parseInt(countS);

function pick<T>(options: T[]) {
  return options[Math.floor(Math.random() * options.length)];
}

let nextId = 0;
let movingAverageLag = 0;
let lastLog = 0;

function createBot() {
  const id = ++nextId;

  console.log(`[${id}] Connecting to ${websocketURL}`);
  const ws = new WebSocket(websocketURL);

  let connected = false;

  ws.addEventListener('open', async () => {
    connected = true;
    let flashing = false;

    clientListen(ws, (message) => {
      switch (message[0]) {
        case MessageType.Position: {
          const [, , , , time] = message;
          movingAverageLag = (movingAverageLag * 29 + (Date.now() - time)) / 30;
          if (Date.now() - lastLog > 1000) {
            console.log('lag', movingAverageLag);
            lastLog = Date.now();
          }
        }
      }
    });

    while (connected) {
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 2000));
      switch (
        pick([
          'move',
          'move',
          'move',
          'move',
          'move',
          'move',
          'move',
          'move',
          'move',
          'move',
          'move',
          'move',
          'flash',
        ])
      ) {
        case 'move': {
          const direction = pick([Direction.Up, Direction.Down, Direction.Left, Direction.Right]);
          // console.log(`[${id}] Moving ${direction}`);
          clientSend(ws, [MessageType.Move, direction, Date.now()]);
          break;
        }
        case 'flash': {
          // console.log(`[${id}] Flashing ${flashing ? 'off' : 'on'}`);
          clientSend(ws, flashing ? [MessageType.StopFlash] : [MessageType.StartFlash]);
          flashing = !flashing;
          break;
        }
        case 'lockIn': {
          // console.log(`[${id}] Locking in`);
          clientSend(ws, [MessageType.LockIn]);
          break;
        }
      }
    }
  });

  ws.addEventListener('error', (err) => {
    console.log(`[${id}] Disconnected because of an error`, err);
    connected = false;
  });
  ws.addEventListener('close', () => {
    console.log(`[${id}] Disconnected`);
    connected = false;
  });
}

for (let i = 0; i < count; i++) {
  createBot();
}
