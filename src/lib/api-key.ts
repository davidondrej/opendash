import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "odak_";
const PREFIX_LENGTH = 8;
const SECRET_BYTES = 24;

export type GeneratedApiKey = {
  raw: string;
  hash: string;
  prefix: string;
};

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function readApiKeyPrefix(raw: string): string {
  return raw.slice(API_KEY_PREFIX.length, API_KEY_PREFIX.length + PREFIX_LENGTH);
}

export function generateApiKey(): GeneratedApiKey {
  const raw = `${API_KEY_PREFIX}${randomBytes(SECRET_BYTES).toString("base64url")}`;
  return {
    raw,
    hash: hashApiKey(raw),
    prefix: readApiKeyPrefix(raw),
  };
}
