<script lang="ts">
  import {fly} from 'svelte/transition';
  import {createEventDispatcher} from 'svelte';
  import Close from './Close.svelte';

  function getNextGame() {
    const nextGame = new Date();
    nextGame.setUTCHours(1);
    nextGame.setUTCMinutes(0);
    nextGame.setUTCSeconds(0);
    nextGame.setUTCMilliseconds(0);

    if (nextGame.valueOf() >= Date.now()) {
      return nextGame;
    } else {
      return new Date(nextGame.valueOf() + 24 * 60 * 60 * 1000);
    }
  }

  function formatTime(t) {
    const h = t.getHours();
    return `${h % 12}${h >= 12 ? 'pm' : 'am'}`;
  }

  const nextGame = getNextGame();

  let showEmail = false;
  let hasError = false;
  let email = '';

  const dispatch = createEventDispatcher();

  function onSubmit() {
    if (/^\s*$/.test(email)) {
      hasError = true;
      setTimeout(() => (hasError = false), 600);
      return;
    }
    dispatch('subscribe', email);
  }

  function hide() {
    dispatch('hide');
  }
</script>

<style>
  form {
    background: var(--yellow);
    border: 1px solid #ad7f28;
    border-radius: 3px;
    box-shadow: var(--shadow) 2px 2px 0px;
    display: flex;
    align-items: center;
    min-width: 260px;
    padding: 2px 0 2px 12px;
    margin-top: 12px;
    pointer-events: auto;
    position: relative;
  }

  @media (max-width: 460px) {
    form {
      flex-direction: column;
      text-align: center;
      align-items: stretch;
      padding: 2px 12px;
    }
    input {
      text-align: center;
    }
  }

  button {
    background: transparent;
    border: none;
    font: inherit;
    cursor: pointer;
    outline: none;
    flex-shrink: 0;
  }
  .button {
    color: var(--light-text);
    text-shadow: #ad7f28 1px 1px 0px;
    padding: 6px 12px;
    font-weight: bold;
  }
  input {
    outline: none;
    background: transparent;
    border: none;
    font: inherit;
    padding: 6px 12px;
    margin-left: -12px;
    flex-grow: 1;
    font-weight: bold;
  }
  .shake {
    animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  @keyframes shake {
    10%,
    90% {
      transform: translate3d(-1px, 0, 0);
    }

    20%,
    80% {
      transform: translate3d(2px, 0, 0);
    }

    30%,
    50%,
    70% {
      transform: translate3d(-4px, 0, 0);
    }

    40%,
    60% {
      transform: translate3d(4px, 0, 0);
    }
  }
</style>

<svelte:options immutable={true} />

<form transition:fly={{y: -100}} on:submit|preventDefault={onSubmit} class:shake={hasError}>
  {#if showEmail}
    <input
      type="text"
      autofocus
      placeholder="Email address"
      bind:value={email}
      on:keydown|stopPropagation
      on:keyup|stopPropagation />
    <button class="button" on:click={() => (showEmail = true)}>Subscribe</button>
  {:else}
    <span>
      Play with us every day at
      <strong>{formatTime(nextGame)}</strong>
      your time.
    </span>
    <button class="button" on:click={() => (showEmail = true)}>Remind me</button>
  {/if}
  <Close on:click={() => dispatch('hide')} backgroundColor="var(--yellow)" color="#ad7f28" />
</form>
