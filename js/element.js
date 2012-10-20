var Util = require('./util')

function Element(type) {
  this.tagName = type
  this.attrs = {}
  this.children = []
  this.style = {}
}

Element.prototype.getAttribute = function(key) {
  return this.attrs[key]
}

Element.prototype.setAttribute = function(key, val) {
  if (this._el) this._el.setAttribute(key, val)
  this.attrs[key] = val
}

Element.prototype.appendChild = function(child) {
  if (this._el) this._el.appendChild(child)
  this.children.push(child)
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
}

/*
Element.prototype.renderServerSide = function() {
  if (this.id) this.attrs['id'] = this.id
  var attrs = []
  Util.each(this.attrs, function(key, val) {
    attrs.push([key, '="', val, '"'].join(''))
  })
  var tag = this.tagName.toLowerCase()
  attrs.unshift(tag)
  if (this.children.length) {
    var children = Func.interleave(Func.flatten(this.children).map(function(child) {
      if (child === null) return ''
      return Util.isString(child) ? escapeHtml(child) : child.render(true)
    }))
    return ['<', attrs.join(' '), '>', children[0].join(''), '</', this.tagName.toLowerCase(), '>'].join('')
  } else {
    return ['<', attrs.join(' '), '/>'].join('')
  }
}
*/

Element.prototype.renderClientSide = function() {
  var el = document.createElement(this.tagName)
  this._el = el
  Util.each(this.attrs, el.setAttribute.bind(el))
  this.children.forEach(function(child) {
    if (child === null) return
    el.appendChild(Util.isString(child) ? document.createTextNode(child) : child.renderClientSide())
  })
  Util.each(this.style, function(key, val) {
    el.style[key] = val
  })
  return el
}

Element.prototype.render = Element.prototype.renderClientSide

module.exports = Element
