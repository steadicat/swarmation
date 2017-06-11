import * as Util from '../util';
import * as Tag from './tag';

function create(name) {
  return Tag.tag.bind(null, name);
}

export const div = create('div');
export const span = create('span');
export const button = create('button');
export const input = create('input');
export const option = create('option');
export const select = create('select');
export const h1 = create('h1');
export const h2 = create('h2');
export const h3 = create('h3');
export const a = create('a');
export const br = create('br');
export const li = create('li');
export const ul = create('ul');
export const p = create('p');
export const em = create('em');
export const title = create('title');
export const head = create('head');
export const body = create('body');
export const link = create('link');
export const html = create('html');
export const script = create('script');
