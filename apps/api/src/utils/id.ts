import { randomBytes } from "crypto";

export function generateApiKey(): string {
  const randomPart = randomBytes(24).toString("base64url");
  return `mc_${randomPart}`;
}

export function extractKeyPrefix(key: string): string {
  return key.slice(0, 11);
}
