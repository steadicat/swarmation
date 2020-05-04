<script lang="ts">
  import {fade} from 'svelte/transition';
  import {createEventDispatcher} from 'svelte';

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
  const nextGame = getNextGame();
  $: hoursLeft = Math.floor((nextGame - Date.now()) / (60 * 60 * 1000));
  $: minutesLeft = Math.floor((nextGame - Date.now() - hoursLeft * 60 * 60 * 1000) / (60 * 1000));

  let showEmail = false;
  let email = '';

  const dispatch = createEventDispatcher();

  function onSubmit() {
    dispatch('subscribe', email);
  }

  function hide() {
    dispatch('hide');
  }
</script>

<style>
  div {
    position: fixed;
    top: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--yellow);
    border: 1px solid #ad7f28;
    border-radius: 3px;
    box-shadow: var(--shadow) 2px 2px 0px;
    display: flex;
    align-items: center;
    min-width: 260px;
    padding: 4px 0;
  }
  @media (max-width: 460px) {
    div {
      flex-direction: column;
      text-align: center;
      align-items: stretch;
    }
    form {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    input {
      text-align: center;
    }
  }

  span {
    margin-left: 12px;
    margin-right: 12px;
  }
  button {
    background: transparent;
    border: none;
    font: inherit;
    cursor: pointer;
    outline: none;
    flex-shrink: 0;
  }
  .remind,
  .subscribe {
    color: var(--light-text);
    text-shadow: #ad7f28 1px 1px 0px;
    padding: 6px 24px 6px 12px;
    font-weight: bold;
  }
  .close {
    font-size: 16px;
    color: #ad7f28;
    padding: 6px;
    position: absolute;
    top: 50%;
    right: 0px;
    transform: translateY(-50%);
  }
  input {
    outline: none;
    background: transparent;
    border: none;
    font: inherit;
    padding: 6px 12px;
  }
</style>

<svelte:options immutable={true} />

<div transition:fade>
  {#if showEmail}
    <form on:submit|preventDefault={onSubmit}>
      <input
        type="text"
        autofocus
        placeholder="Email address"
        bind:value={email}
        on:keydown|stopPropagation
        on:keyup|stopPropagation />
      <button class="subscribe" on:click={() => (showEmail = true)}>Remind me</button>
    </form>
  {:else}
    <span>
      It’s a bit lonely right now. Join us for a game in
      <strong>{hoursLeft} hours and {minutesLeft} minutes.</strong>
    </span>
    <button class="remind" on:click={() => (showEmail = true)}>Remind me</button>
  {/if}
  <button class="close" on:click={() => dispatch('hide')}>×</button>
</div>
