import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

import {SaveData} from '../protocol';
dotenv.config();

export function sign(value: SaveData) {
  if (!process.env.SECRET) throw new Error('Missing SECRET environment variable');
  const serializedValue = Buffer.from(JSON.stringify(value)).toString('base64');
  return `${serializedValue}.${crypto
    .createHmac('sha256', process.env.SECRET)
    .update(serializedValue)
    .digest('base64')
    .replace(/\=+$/, '')}`;
}

export function validate(signedValue: string) {
  const [value] = signedValue.split('.');
  let parsedValue: SaveData | null = null;
  try {
    parsedValue = JSON.parse(Buffer.from(value, 'base64').toString('ascii')) as SaveData;
  } catch (err) {
    console.error(err);
    return null;
  }
  if (signedValue !== sign(parsedValue)) return null;
  return parsedValue;
}
