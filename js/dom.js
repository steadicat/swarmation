var Dom = {};

Dom.get = function(id) {
  return document.getElementById(id);
};
Dom.create = function(tag) {
  return document.createElement(tag);
};
Dom.listen = function(el, event, cb) {
  el.addEventListener(event, cb);
};

Dom.addClass = function(el, cl) {
  var cls = el.getAttribute('class');
  var classes = cls ? cls.split(' ') : [];
  el.setAttribute('class', classes.concat([cl]).join(' '));
};

Dom.removeClass = function(el, cl) {
  var cls = el.getAttribute('class');
  var classes = cls ? cls.split(' ') : [];
  var newClasses = [];
  for (var i = 0; i < classes.length; i++) {
    if (classes[i] != cl) newClasses.push(classes[i]);
  }
  el.setAttribute('class', newClasses.join(' '));
};

Dom.remove = function(el) {
  el.parentNode.removeChild(el);
};

Dom.isEl = function(el) {
  return el instanceof HTMLElement;
};

Dom.empty = function(el) {
  el.innerHTML = '';
};

Dom.left = function(el) {
  var sum = el.offsetLeft;
  while ((el = el.offsetParent)) sum += el.offsetLeft + el.clientLeft;
  return sum;
};

Dom.top = function(el) {
  var sum = el.offsetTop;
  while ((el = el.offsetParent)) sum += el.offsetTop + el.clientTop;
  return sum;
};

module.exports = Dom;
