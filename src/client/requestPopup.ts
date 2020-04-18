let requestPopupShown = false;

// TODO
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showRequestPopup() {
  if (requestPopupShown) return;
  const requestPopup = document.createElement('div');
  requestPopup.className = 'megaphone pvs';
  requestPopup.appendChild(
    document.createTextNode('Swarmation is extra fun with more people. Ask some friends to join: ')
  );
  document.getElementById('container')?.appendChild(requestPopup);
  requestPopupShown = true;
}
