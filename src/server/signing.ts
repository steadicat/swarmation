import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
dotenv.config();

export function sign(value: any) {
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
  let parsedValue;
  try {
    parsedValue = JSON.parse(Buffer.from(value, 'base64').toString('ascii'));
  } catch (err) {
    console.error(err);
    return null;
  }
  if (parsedValue !== sign(value)) return null;
  return parsedValue;
}
