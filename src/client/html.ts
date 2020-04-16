import * as Util from '../util';
import * as Dom from './dom';

function isSelector(str: string | unknown): str is string {
  if (!str) return true;
  if (typeof str !== 'string') return false;
  if (str.indexOf(' ') >= 0) return false;
  return str.charAt(0) === '#' || str.charAt(0) === '.';
}

function nonNull(x: unknown) {
  return x !== null;
}

type Attributes = {[name: string]: string};
type Styles = {[name in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[name]};

function tag(tag: string, ...args: Array<string | Attributes | Styles | HTMLElement>) {
  const selector: string = isSelector(args[0]) ? (args.shift() as string) : '';
  const attrs: Attributes = Util.isObject(args[0]) ? (args.shift() as Attributes) : {};
  const style: Styles = Util.isObject(args[0]) ? (args.shift() as Styles) : {};

  const children = Util.flatten(args)
    .filter(nonNull)
    .map((child) => {
      return typeof child === 'string' ? document.createTextNode(child) : child;
    });

  const element = document.createElement(tag.toUpperCase());
  if (selector) {
    const matches = selector.match(/([#.][^#.]+)/g);
    matches.forEach((bit: string) => {
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

  for (const name in attrs) {
    element.setAttribute(name, attrs[name]);
  }
  for (const prop in style) {
    element.style[prop as keyof Omit<Styles, 'length' | 'parentRule'>] =
      style[prop as keyof Styles];
  }
  children.forEach(element.appendChild.bind(element));
  return element;
}

export const div = tag.bind(null, 'div');
export const span = tag.bind(null, 'span');
export const h3 = tag.bind(null, 'h3');
export const a = tag.bind(null, 'a');
export const p = tag.bind(null, 'p');
