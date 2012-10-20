var Util = require('./util')
var Dom = require('./dom')
var Element = require('./element')

var Tag = {}

Tag.tag = function(tag, selector, attrs, children, text) {
  var args = [selector, attrs, children, text]
  selector = args.filter(Util.isString)[0] || ''
  if (selector.length > 0 && selector.indexOf('#') !== 0 && selector.indexOf('.') !== 0) {
    text = selector
    selector = ''
  } else {
    text = args.filter(Util.isString)[1] || null
  }
  attrs = args.filter(Util.isObject)[0] || {}
  children = args.filter(Util.isArray)[0] || args.filter(Dom.isEl)[0] || []
  children = Util.isArray(children) ? children : [children]

  var element = new Element(tag.toUpperCase())

  if (selector) {
    selector = selector.match(/([#\.][^#\.]+)/g)
    selector.forEach(function(bit) {
      switch (bit.charAt(0)) {
      case '#':
        element.id = bit.substring(1)
        break
      case '.':
        Dom.addClass(element, bit.substring(1))
        break
      }
    })
  }

  element.appendChild(text)
  Util.each(attrs, element.setAttribute.bind(element))
  Util.flatten(children).forEach(element.appendChild.bind(element))
  return element
}

module.exports = Tag

