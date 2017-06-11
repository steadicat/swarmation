var Util = require('./util');
var Dom = require('./dom');

var Tag = {};

function isSelector(string) {
  if (!string) return true;
  if (string.indexOf(' ') >= 0) return false;
  return string.charAt(0) == '#' || string.charAt(0) == '.';
}

function nonNull(x) {
  return x !== null;
}

Tag.tag = function(tag) {
  var args = Util.array(arguments, 1);
  var selector = isSelector(args[0]) ? args.shift() : '';
  var attrs = Util.isObject(args[0]) ? args.shift() : {};
  var style = Util.isObject(args[0]) ? args.shift() : {};

  var children = Util.flatten(args).filter(nonNull).map(function(child) {
    return !Dom.isEl(child) ? document.createTextNode(child) : child;
  });

  var element = Dom.create(tag.toUpperCase());
  if (selector) {
    selector = selector.match(/([#\.][^#\.]+)/g);
    selector.forEach(function(bit) {
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

  Util.each(attrs, element.setAttribute.bind(element));
  Util.each(style, function(key, val) {
    element.style[key] = val;
  });
  children.forEach(element.appendChild.bind(element));
  return element;
};

module.exports = Tag;
