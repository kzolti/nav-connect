import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";
import type { EntityIdType } from "nav-osa-types";

export function getRequestId(): EntityIdType {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(8).toString("hex");
  return (ts + rnd).slice(0, 30);
}

export function getTimestamp(): string {
  return new Date().toISOString();
}

export function sha512(msg: string): string {
  return crypto.createHash("sha512").update(msg).digest("hex").toUpperCase();
}

export function sha3_512(msg: string): string {
  return crypto.createHash("sha3-512").update(msg).digest("hex").toUpperCase();
}

export function formatNavTimestampForHash(isoTs: string): string {
  const d = new Date(isoTs);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

export function generateRequestMetadata(): { requestId: string; timestamp: string; navTimestampForHash: string } {
  const requestId = getRequestId();
  const timestamp = getTimestamp();
  const navTimestampForHash = formatNavTimestampForHash(timestamp);
  return { requestId, timestamp, navTimestampForHash };
}

export function computeManageRequestSignature(
  requestId: string,
  navTimestampForHash: string,
  signatureKey: string,
  operations: { operation: string; data: string }[]
): string {
  const partialHash = requestId + navTimestampForHash + signatureKey;
  const indexHashes = operations.map(
    (op) => sha3_512(op.operation + op.data)
  );
  return sha3_512(partialHash + indexHashes.join(""));
}

export function decodeExchangeToken(encodedToken: string, exchangeKey: string): string {
  const keyBuffer = Buffer.from(exchangeKey, "utf8").slice(0, 16);
  const tokenBuffer = Buffer.from(encodedToken, "base64");
  const decipher = crypto.createDecipheriv("aes-128-ecb", keyBuffer, null);
  const decoded = Buffer.concat([decipher.update(tokenBuffer), decipher.final()]);
  return decoded.toString("utf8").replace(/\0/g, "").trim();
}