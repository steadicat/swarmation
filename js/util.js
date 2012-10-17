var Util = {}

Util.rateLimit = function(target, rate, f) {
  if (target.timeout) return
  target.timeout = setTimeout(function() {
    f.call(target)
    target.timeout = null
  }, rate)
}

Util.each = function(list, f) {
  for (var key in list) f(key, list[key])
}

module.exports = Util
