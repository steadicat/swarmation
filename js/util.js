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

Util.isObject = function(x) { return Object.prototype.toString.call(x) == '[object Object]' }

Util.each = function(list, f) {
  if (Util.isObject(list)) {
    for (var key in list) f(key, list[key])
  } else {
    var l = list.length
    var res
    for (var i=0; i<l; i++) {
      res = f(list[i], i)
      if (res === false) break
    }
  }
}

Util.array = function(l) { return Array.prototype.slice.call(l) }

module.exports = Util
