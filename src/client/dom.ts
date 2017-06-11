export function get(id) {
  return document.getElementById(id);
}

export function create(tag) {
  return document.createElement(tag);
}

export function listen(el, event, cb) {
  el.addEventListener(event, cb);
}

export function addClass(el, cl) {
  const cls = el.getAttribute('class');
  const classes = cls ? cls.split(' ') : [];
  el.setAttribute('class', classes.concat([cl]).join(' '));
}

export function removeClass(el, cl) {
  const cls = el.getAttribute('class');
  const classes = cls ? cls.split(' ') : [];
  const newClasses = [];
  for (const c of classes) {
    if (c !== cl) newClasses.push(c);
  }
  el.setAttribute('class', newClasses.join(' '));
}

export function remove(el) {
  el.parentNode.removeChild(el);
}

export function isEl(el) {
  return el instanceof HTMLElement;
}

export function empty(el) {
  el.innerHTML = '';
}

export function left(el) {
  let sum = el.offsetLeft;
  // tslint:disable-next-line:no-conditional-assignment
  while ((el = el.offsetParent)) sum += el.offsetLeft + el.clientLeft;
  return sum;
}

export function top(el) {
  let sum = el.offsetTop;
  // tslint:disable-next-line:no-conditional-assignment
  while ((el = el.offsetParent)) sum += el.offsetTop + el.clientTop;
  return sum;
}
