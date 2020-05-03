import Bugsnag from '@bugsnag/js';
import * as crypto from 'crypto';

import {SaveData} from '../protocol';

export function sign(value: SaveData) {
  if (process.env.SECRET === undefined) throw new Error('Missing SECRET environment variable');
  const serializedValue = Buffer.from(JSON.stringify(value)).toString('base64');
  return `${serializedValue}.${crypto
    .createHmac('sha256', process.env.SECRET)
    .update(serializedValue)
    .digest('base64')}`.replace(/=+/g, '');
}

export function validate(signedValue: string) {
  const [value] = signedValue.split('.');
  const json = Buffer.from(value, 'base64').toString('ascii');
  let parsedValue: SaveData | null = null;
  try {
    parsedValue = JSON.parse(json) as SaveData;
  } catch (err) {
    Bugsnag.notify(err);
    console.error(err, json);
    return null;
  }
  if (signedValue !== sign(parsedValue)) return null;
  return parsedValue;
}
