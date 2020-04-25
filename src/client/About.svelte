<script>
  let touch = 'ontouchstart' in window;
</script>

<style>
  .about {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 100%;
    background: var(--light-blue);
    color: var(--light-text);
    text-shadow: var(--shadow) 1px 1px 0;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    user-select: text;
  }

  h1 {
    font-family: 'Lobster';
    font-size: 50px;
    color: var(--light-text);
    text-shadow: var(--medium-blue) 2px 2px 0px;
    text-align: center;
    cursor: pointer;
    margin: 40px 20px;
  }

  a {
    color: var(--light-text);
    font-weight: bold;
    text-decoration: none;
  }

  p {
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .inner {
    max-width: 24em;
    margin: 0 auto;
    padding: 20px;
  }

  .arrow-keys {
    height: 32px;
  }

  .key {
    box-shadow: none;
    font-size: 12px;
    border: 1px solid var(--light-text);
    border-radius: 3px;
    display: inline-block;
    line-height: 16px;
    padding: 0 6px;
    text-align: center;
  }

  .wide {
    padding: 0 24px;
  }
</style>

<div class="about">
  <h1 on:click>Swarmation</h1>
  <div class="inner">

    <h2>How to play</h2>

    <p>Welcome to life as a pixel.</p> 

    <p>
      {#if touch}
      Use your <img class="arrow-keys" src="/images/arrow-keys.svg" alt="arrow keys" />
      <span class="text">to move</span>.
      {:else}
      Swipe anywhere to move.
      {/if}
    </p>

    <p>
      <span class="key">S</span>
      to lock into position.
    </p>
    <p>
      <span class="key wide">Spacebar</span>
      to flash with color.
    </p>

    <p>Get into formation with other players before the countdown runs out.</p>

    <h2 style="margin-top: 40px">About</h2>

    <p>A game by <a href="http://twitter.com/steadicat">Stefano J. Attardi</a>, <a href="http://twitter.com/findjoey">Zach Bialecki</a> & <a href="http://twitter.com/ollerac">David Miranda</a>.</p>
    
    <p>The original version of the game was built in a weekend in 2010 and won <a href="https://techcrunch.com/2010/09/01/nodejs-knockout/">the first ever Node.js Knockout.</p>

    <p>The source code is available on <a href="https://github.com/steadicat/swarmation">GitHub</a>.</p>

    <p>Follow us on Twitter: <a href="https://twitter.com/swarmation">@swarmation</a>.</p>
  </div>
</div>