var DEBUG = true

var Util = {}

Util.log = function(m) {
  try {
    if (DEBUG) console.log(m)
  } catch (e) {}
}

Util.rateLimit = function(target, rate, f) {
  if (target.timeout) return
  target.timeout = setTimeout(function() {
    f.call(target)
    target.timeout = null
  }, rate)
}

module.exports = Util
