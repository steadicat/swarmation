var Util = require('./util');
var Tag = require('./tag');

var Html = {};

function create(name) {
  Html[name] = Tag.tag.bind(null, name);
}

create('div');
create('span');
create('button');
create('input');
create('option');
create('select');
create('h1');
create('h2');
create('h3');
create('a');
create('br');
create('li');
create('ul');
create('p');
create('em');
create('title');
create('head');
create('body');
create('link');
create('html');
create('script');

module.exports = Html;
