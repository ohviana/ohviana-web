import { randomInt } from 'node:crypto';

/** A fresh mobile per test ("6xxxx xxxxx" as typed, and its E.164 form) for checkout contacts. */
export function testPhone(): { typed: string; e164: string } {
  const digits = `6${String(randomInt(0, 1e9)).padStart(9, '0')}`;
  return { typed: `${digits.slice(0, 5)} ${digits.slice(5)}`, e164: `+91${digits}` };
}
