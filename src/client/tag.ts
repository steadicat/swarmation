import * as Util from '../util';
import * as Dom from './dom';

function isSelector(str) {
  if (!str) return true;
  if (str.indexOf(' ') >= 0) return false;
  return str.charAt(0) === '#' || str.charAt(0) === '.';
}

function nonNull(x) {
  return x !== null;
}

export function tag(tag, ...args) {
  let selector = isSelector(args[0]) ? args.shift() : '';
  const attrs = Util.isObject(args[0]) ? args.shift() : {};
  const style = Util.isObject(args[0]) ? args.shift() : {};

  const children = Util.flatten(args).filter(nonNull).map(child => {
    return !Dom.isEl(child) ? document.createTextNode(child) : child;
  });

  const element = Dom.create(tag.toUpperCase());
  if (selector) {
    selector = selector.match(/([#\.][^#\.]+)/g);
    selector.forEach(bit => {
      switch (bit.charAt(0)) {
        case '#':
          element.id = bit.substring(1);
          break;
        case '.':
          Dom.addClass(element, bit.substring(1));
          break;
      }
    });
  }

  Object.entries(attrs).forEach(([key, val]) => element.setAttribute(key, val));
  Object.entries(style).forEach(([key, val]) => {
    element.style[key] = val;
  });
  children.forEach(element.appendChild.bind(element));
  return element;
}
