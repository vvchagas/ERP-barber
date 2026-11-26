import { createHash, timingSafeEqual } from "node:crypto";

export function secretMatches(value: string, expected: string | undefined): boolean {
  if (!expected) {
    return false;
  }
  const valueDigest = createHash("sha256").update(value).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(valueDigest, expectedDigest);
}

export function magicKeyMatches(value: string): boolean {
  return secretMatches(value, process.env.MAGIC_KEY);
}
