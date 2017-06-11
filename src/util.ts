export function rateLimit(target, rate, f) {
  if (target.timeout) return;
  target.timeout = setTimeout(() => {
    f.call(target);
    target.timeout = null;
  }, rate);
}

export function isFunc(x) {
  return typeof x === 'function';
}

export function isObject(x) {
  return x + '' === '[object Object]';
}

export function isString(x) {
  return typeof x === 'string';
}

export function flatten(input, shallow = false, output = []) {
  input.forEach(value => {
    if (Array.isArray(value)) {
      shallow ? output.push(value) : flatten(value, shallow, output);
    } else {
      output.push(value);
    }
  });
  return output;
}
