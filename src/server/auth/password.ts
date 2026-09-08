import { hash, verify } from "@node-rs/argon2";

const options = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string) {
  return hash(password, options);
}

export function verifyPassword(data: { hash: string; password: string }) {
  return verify(data.hash, data.password, options);
}
