export function rateLimit<T extends {timeout?: NodeJS.Timer | null}>(target: T, rate: number, f: (this: T) => void) {
  if (target.timeout) return;
  target.timeout = setTimeout(() => {
    f.call(target);
    target.timeout = null;
  }, rate);
}

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
  input.forEach(value => {
    if (Array.isArray(value)) {
      shallow ? output.push(value) : flatten(value, shallow, output);
    } else {
      output.push(value);
    }
  });
  return output;
}
