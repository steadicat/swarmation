let welcome: HTMLElement | null = null;
let welcomeCountdown = 20;

export function showWelcome() {
  if (welcome) return;
  welcome = document.createElement('div');
  welcome.className = 'welcome pam';
  welcome.style.width = '240px';
  welcome.innerHTML = `
    <h3 class="b medium">Welcome to life as a pixel</h3>
    <p class="mtm">Use your <span class="arrow-image arrow"></span> keys to move</p>
  `;
  document.body.appendChild(welcome);
  welcome.style.opacity = '0';
  setTimeout(() => {
    if (!welcome) return;
    welcome.classList.add('fade');
    welcome.style.opacity = '1';
  }, 100);
}

export function hideWelcome() {
  if (!welcome) return;
  welcome.style.opacity = '0';
  setTimeout(() => {
    if (!welcome) return;
    welcome.parentNode?.removeChild(welcome);
    welcome = null;
  }, 1000);
}

export function startCountdown() {
  if (!welcome) return;

  welcome.innerHTML = `
    <p>Get into a formation with other players before the countdown expires</p>
  `;
  welcomeCountdown--;
  if (welcomeCountdown === 0) {
    hideWelcome();
  }
  setTimeout(hideWelcome, 10000);
}

export function positionWelcome([left, top]: [number, number]) {
  if (!welcome) return;
  welcome.style.left = left - welcome.offsetWidth / 2 + 5 + 'px';
  welcome.style.top = top - welcome.offsetHeight - 15 + 'px';
}
