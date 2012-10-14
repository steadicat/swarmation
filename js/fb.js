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
    appId: '536327243050948', // App ID
    channelUrl: '//'+window.location.hostname+'/channel',
    status: true,
    cookie: true,
    xfbml: true
  });

  // listen for and handle auth.statusChange events
  FB.Event.subscribe('auth.statusChange', function(response) {
    if (response.authResponse) {
      // user has auth'd your app and is logged into Facebook
      FB.api('/me', function(me){
        if (me.name) {
          Players.login(me.id, response.authResponse.accessToken, me.first_name)
        }
      })
      //document.getElementById('auth-loggedout').style.display = 'none';
      //document.getElementById('auth-loggedin').style.display = 'block';
    } else {
      // user has not auth'd your app, or is not logged into Facebook
      //document.getElementById('auth-loggedout').style.display = 'block';
      //document.getElementById('auth-loggedin').style.display = 'none';
    }
  });

  // respond to clicks on the login and logout links
  //document.getElementById('auth-loginlink').addEventListener('click', function(){
  //  FB.login();
  //});
  //document.getElementById('auth-logoutlink').addEventListener('click', function(){
  //  FB.logout();
  //});

}

module.exports = Fb
