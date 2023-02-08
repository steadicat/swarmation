<svelte:options immutable={true} />

<script lang="ts">
  import Board from './Board.svelte';
  import FormationComponent from './Formation.svelte';
  import Countdown from './Countdown.svelte';
  import Score from './Score.svelte';
  import SuccessRate from './SuccessRate.svelte';
  import About from './About.svelte';
  import Subscribe from './Subscribe.svelte';
  import Message from './Message.svelte';
  import Instructions from './Instructions.svelte';
  import {createEventDispatcher} from 'svelte';
  import {Formation} from '../formations';

  export let message: string | null = null;

  export let players: Player[];
  export let selfID: number | null = null;
  export let activeIds: number[] = [];
  export let hasMoved = false;
  export let formation: Pick<Formation, 'time' | 'name' | 'map'>;

  export let scoreChanges: number[];

  let showAbout = false;
  let showInstructions = true;
  let showSubscribe = false;
  let subscribeShown = false;
  let width = 800;

  $: self = players.find((player) => player.id === selfID)!;
  $: score = self ? self.score : 0;

  $: {
    if (!subscribeShown && players.length > 0 && players.length < 3) {
      subscribeShown = true;
      setTimeout(() => {
        showSubscribe = true;
      }, 1000);
    }
  }

  const dispatch = createEventDispatcher();
</script>

<svelte:window bind:innerWidth={width} />

<Board {players} {self} {activeIds} {hasMoved} {scoreChanges} />

<FormationComponent {formation} />
<Countdown {formation} />
<Score {score} />
<SuccessRate {self} />

<div class="header">
  <h1 style="font-size: {20 + width / 40}px" on:click={() => (showAbout = true)}>Swarmation</h1>
  {#if showSubscribe && hasMoved}
    <Subscribe
      on:hide={() => (showSubscribe = false)}
      on:subscribe={(event) => {
        showSubscribe = false;
        dispatch('subscribe', event.detail);
      }}
    />
  {/if}
</div>

{#if showInstructions && hasMoved}
  <Instructions
    on:hide={() => (showInstructions = false)}
    on:showAbout={() => (showAbout = true)}
  />
{/if}

{#if message}
  <Message {message} />
{/if}

{#if showAbout}
  <About on:click={() => (showAbout = false)} />
{/if}

<style>
  :global(:root) {
    --unit: 14px;

    --light-text: #fff;
    --dark-text: #024;

    --shadow: rgba(0, 36, 62, 0.2);
    --dark-shadow: #000000;
    --light-highlight: rgba(255, 255, 255, 0.25);
    --highlight: rgba(255, 255, 255, 0.3);
    --dark-highlight: rgba(255, 255, 255, 0.4);

    --light-blue: #bdd0da;
    --medium-blue: #8ca2ad;

    --light-gray: #dbe5eb;
    --grid-gray: #bdd0da;
    --gray: #9badb8;
    --dark-gray: #444444;

    --teal: #66dddd;
    --orange: #ff8855;
    --yellow: #ffbb33;
  }

  :global(html, body, h1, h2, h3, h4, p) {
    margin: 0;
    padding: 0;
  }

  :global(html) {
    min-height: 100%;
  }

  :global(body) {
    overflow: hidden;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex: 1;
    font: 14px/20px 'Source Sans Pro', sans-serif;
    color: var(--dark-text);
    background: var(--light-blue);
  }

  :global(#game) {
    position: relative;
    flex: 1;
    background: var(--light-gray);
    display: flex;
    user-select: none;
  }

  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 24px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  h1 {
    font-family: 'Lobster';
    font-size: 40px;
    line-height: 1;
    color: var(--light-text);
    text-shadow: var(--light-blue) 2px 2px 0px;
    text-align: center;
    cursor: pointer;
    pointer-events: auto;
  }
</style>
