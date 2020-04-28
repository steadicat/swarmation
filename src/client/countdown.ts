import {writable} from 'svelte/store';

export function createCountdown(time: number) {
  let interval = -1;

  const {subscribe, set, update} = writable(time, () => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  });

  function tick() {
    update((n) => (n === 0 ? 0 : n - 1));
  }

  function start(time: number) {
    set(time);
    window.clearInterval(interval);
    interval = window.setInterval(tick, 1000);
  }

  return {subscribe, start};
}

export const countdown = createCountdown(-1);
