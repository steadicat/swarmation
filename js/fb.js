var Dom = require('./dom')
var Players = require('./players')

// Load the SDK Asynchronously
var js
var id = 'facebook-jssdk'
var ref = document.getElementsByTagName('script')[0]
if (!document.getElementById(id)) {
  js = document.createElement('script')
  js.id = id
  js.async = true
  js.src = "//connect.facebook.net/en_US/all.js"
  ref.parentNode.insertBefore(js, ref)
}

var Fb = {}

// Init the SDK upon load
window.fbAsyncInit = function() {
  FB.init({
    appId: '536327243050948',
    channelUrl: '//'+window.location.hostname+'/channel',
    status: true,
    cookie: true,
    xfbml: true
  })

  // listen for and handle auth.statusChange events
  FB.Event.subscribe('auth.statusChange', function(response) {
    if (response.authResponse) {
      FB.api('/me', function(me){
        if (me.name) {
          Players.login(me.id, response.authResponse.accessToken, me.first_name)
        }
      })
    }
  })
}

module.exports = Fb
