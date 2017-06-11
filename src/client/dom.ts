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
  var cls = el.getAttribute('class');
  var classes = cls ? cls.split(' ') : [];
  el.setAttribute('class', classes.concat([cl]).join(' '));
}

export function removeClass(el, cl) {
  var cls = el.getAttribute('class');
  var classes = cls ? cls.split(' ') : [];
  var newClasses = [];
  for (var i = 0; i < classes.length; i++) {
    if (classes[i] != cl) newClasses.push(classes[i]);
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
  var sum = el.offsetLeft;
  while ((el = el.offsetParent)) sum += el.offsetLeft + el.clientLeft;
  return sum;
}

export function top(el) {
  var sum = el.offsetTop;
  while ((el = el.offsetParent)) sum += el.offsetTop + el.clientTop;
  return sum;
}
