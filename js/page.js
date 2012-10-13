var Dom = require('./dom')

var Page = {}

Page.displayNotice = function(text) {
  var notices = Dom.ge('notices')
  var div = Dom.ce('p')
  div.textContent = text
  Dom.addClass(div, 'notice')
  Dom.addClass(div, 'border')
  Dom.addClass(div, 'white')
  div.style.opacity = 0
  notices.insertBefore(div, notices.firstChild)
  setTimeout(function() {
    div.style.opacity = 1
  })
}

Page.displayMessage = function(text) {
  var message = Dom.ge('message')
  message.innerHTML = text
  message.setAttribute('style', 'display: block')
}

module.exports = Page
