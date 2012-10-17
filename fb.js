var sys = require('sys')
var request = require('request')

var fb = {}

function response(cb) {
  return function(err, resp, body) {
    if (err) {
      sys.log('FB: Error: ' + resp + ' ' + JSON.stringify(body))
      return cb(err)
    }
    sys.log('FB: Response: ' + JSON.stringify(body))
    cb(null, body)
  }
}

fb.get = function(path, token, cb) {
  sys.log('FB: Get ' + path)
  request.get({
    uri: 'https://graph.facebook.com/' + path,
    qs: { access_token: token },
    json: true,
  }, response(cb))
}

fb.post = function(path, token, data, cb) {
  data.access_token = token
  sys.log('FB: Post ' + path)
  request.post({
    uri: 'https://graph.facebook.com/'+path,
    form: data,
    json: true
  }, response(cb))
}

module.exports = fb
