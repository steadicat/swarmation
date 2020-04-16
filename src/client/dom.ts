export function addClass(el: HTMLElement, cl: string) {
  const cls = el.getAttribute('class');
  const classes = cls ? cls.split(' ') : [];
  el.setAttribute('class', classes.concat([cl]).join(' '));
}

export function removeClass(el: HTMLElement, cl: string) {
  const cls = el.getAttribute('class');
  const classes = cls ? cls.split(' ') : [];
  const newClasses = [];
  for (const c of classes) {
    if (c !== cl) newClasses.push(c);
  }
  el.setAttribute('class', newClasses.join(' '));
}

export function remove(el: HTMLElement) {
  el.parentNode.removeChild(el);
}
