<svelte:options immutable={true} />

<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {fly} from 'svelte/transition';
  import Close from './Close.svelte';

  const dispatch = createEventDispatcher();
</script>

<div class="wrapper" transition:fly={{y: 100}}>
  <div class="banner">
    Get into formation before the time runs out.
    <button class="button" on:click={() => dispatch('showAbout')}>Learn more</button>
    <Close on:click={() => dispatch('hide')} />
  </div>
</div>

<style>
  .wrapper {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
  }

  .banner {
    align-items: center;
    background: var(--light-text);
    border-radius: 3px;
    border: 1px solid var(--medium-blue);
    bottom: 0;
    box-shadow: var(--shadow) 2px 2px 0px;
    display: flex;
    left: 0;
    min-width: 260px;
    padding: 2px 0 2px 12px;
    pointer-events: auto;
    position: relative;
  }

  @media (max-width: 460px) {
    .banner {
      flex-direction: column;
      text-align: center;
      align-items: stretch;
      padding: 2px 12px;
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
    color: var(--light-blue);
    text-shadow: var(--dark-gray) 1px 1px 0px;
    padding: 6px 12px;
    font-weight: bold;
  }
</style>
