export function isFunc(x: any) {
  return typeof x === 'function';
}

export function isObject(x: any) {
  return x + '' === '[object Object]';
}

export function isString(x: any) {
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
