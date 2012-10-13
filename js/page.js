var Dom = require('./dom')

var Page = {}

Page.displayNotice = function(text) {
  var notices = Dom.ge('notices')
  var div = Dom.ce('p')
  div.textContent = text
  div.setAttribute('class', 'sidebar-notice')
  div.setAttribute('style', 'opacity: 0, color: #ffc0cb, height: 0, overflow: hidden')
  notices.insertBefore(div, notices.firstChild)
}

Page.displayMessage = function(text) {
  var message = Dom.ge('message')
  message.innerHTML = text
  message.setAttribute('style', 'display: block')
}

module.exports = Page
