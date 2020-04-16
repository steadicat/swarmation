export function isFunc(x: unknown) {
  return typeof x === 'function';
}

export function isObject(x: unknown) {
  return x + '' === '[object Object]';
}

export function isString(x: unknown) {
  return typeof x === 'string';
}

export function flatten<T>(input: T[], shallow = false, output: T[] = []) {
  input.forEach((value) => {
    if (Array.isArray(value)) {
      shallow ? output.push(value) : flatten(value, shallow, output);
    } else {
      output.push(value);
    }
  });
  return output;
}
