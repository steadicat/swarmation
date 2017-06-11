var Util = {};

Util.array = function(l, s, e) {
  return [].slice.call(l, s, e);
};

Util.rateLimit = function(target, rate, f) {
  if (target.timeout) return;
  target.timeout = setTimeout(function() {
    f.call(target);
    target.timeout = null;
  }, rate);
};

Util.each = function(list, f) {
  for (var key in list) f(key, list[key]);
};

Util.isArray = Array.isArray;
Util.isFunc = function(x) {
  return typeof x == 'function';
};
Util.isObject = function(x) {
  return Object.prototype.toString.call(x) == '[object Object]';
};
Util.isString = function(x) {
  return Object.prototype.toString.call(x) == '[object String]';
};

function flatten(input, shallow, output) {
  input.forEach(function(value) {
    if (Util.isArray(value)) {
      shallow ? push.apply(output, value) : flatten(value, shallow, output);
    } else {
      output.push(value);
    }
  });
  return output;
}

Util.flatten = function(array, shallow) {
  return flatten(array, shallow, []);
};

module.exports = Util;
