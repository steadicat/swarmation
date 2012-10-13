var Dom = {}

Dom.ge = function(id) { return document.getElementById(id) }
Dom.ce = function(tag) { return document.createElement(tag) }
Dom.listen = function(el, event, cb) { el.addEventListener(event, cb) }

Dom.addClass = function(el, cl) {
  var cls = el.getAttribute('class')
  var classes = cls ? cls.split(' ') : []
  el.setAttribute('class', classes.concat([cl]).join(' '))
}

Dom.removeClass = function(el, cl) {
  var cls = el.getAttribute('class')
  var classes = cls ? cls.split(' ') : []
  var newClasses = []
  for (var i=0; i<classes.length; i++) {
    if (classes[i] != cl) newClasses.push(classes[i])
  }
  el.setAttribute('class', newClasses.join(' '))
}

module.exports = Dom
