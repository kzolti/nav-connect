import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import {
  getRequestId,
  getTimestamp,
  sha512,
  sha3_512,
  formatNavTimestampForHash,
  generateRequestMetadata,
  computeManageRequestSignature,
  decodeExchangeToken,
} from "../src/crypto.js";

function aes128EcbEncrypt(exchangeKey: string, plaintext: string): string {
  const keyBuffer = Buffer.from(exchangeKey, "utf8").slice(0, 16);
  const cipher = crypto.createCipheriv("aes-128-ecb", keyBuffer, null);
  return Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]).toString("base64");
}

void describe("sha512", () => {
  void it("matches the RFC 6234 test vector for 'abc'", () => {
    // RFC 6234 SHA-512 test vector (case 1)
    assert.equal(
      sha512("abc"),
      "DDAF35A193617ABACC417349AE20413112E6FA4E89A97EA20A9EEEE64B55D39A2192992A274FC1A836BA3C23A3FEEBBD454D4423643CE80E2A9AC94FA54CA49F"
    );
  });

  void it("matches the RFC 6234 test vector for the empty string", () => {
    assert.equal(
      sha512(""),
      "CF83E1357EEFB8BDF1542850D66D8007D620E4050B5715DC83F4A921D36CE9CE47D0D13C5D85F2B0FF8318D2877EEC2F63B931BD47417A81A538327AF927DA3E"
    );
  });
});

void describe("sha3_512", () => {
  void it("matches the NIST FIPS 202 test vector for 'abc'", () => {
    assert.equal(
      sha3_512("abc"),
      "B751850B1A57168A5693CD924B6B096E08F621827444F70D884F5D0240D2712E10E116E9192AF3C91A7EC57647E3934057340B4CF408D5A56592F8274EEC53F0"
    );
  });

  void it("matches the NIST FIPS 202 test vector for the empty string", () => {
    assert.equal(
      sha3_512(""),
      "A69F73CCA23A9AC5C8B567DC185A756E97C982164FE25859E0D1DCC1475C80A615B2123AF1F5F94C11E3E9402C3AC558F500199D95B6D3E301758586281DCD26"
    );
  });
});

void describe("formatNavTimestampForHash", () => {
  void it("formats UTC time as yyyyMMddHHmmss", () => {
    assert.equal(formatNavTimestampForHash("2025-06-01T07:08:09.123Z"), "20250601070809");
  });

  void it("zero-pads all components", () => {
    assert.equal(formatNavTimestampForHash("2025-01-05T00:00:00.000Z"), "20250105000000");
  });
});

void describe("generateRequestMetadata", () => {
  void it("returns a requestId, an ISO timestamp and the matching hash timestamp", () => {
    const { requestId, timestamp, navTimestampForHash } = generateRequestMetadata();
    assert.ok(requestId.length >= 1 && requestId.length <= 30, `requestId length ${requestId.length} out of range`);
    assert.ok(/^[a-z0-9]+$/.test(requestId), "requestId must be lowercase alphanumeric");
    assert.equal(new Date(timestamp).toISOString(), timestamp, "timestamp must be a valid ISO string");
    assert.equal(navTimestampForHash, formatNavTimestampForHash(timestamp));
  });

  void it("generates unique requestIds", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestMetadata().requestId));
    assert.equal(ids.size, 100);
  });

  void it("returns a valid ISO timestamp", () => {
    assert.equal(typeof getTimestamp(), "string");
    assert.ok(Number.isFinite(Date.parse(getTimestamp())));
  });

  void it("returns unique request ids from getRequestId", () => {
    assert.notEqual(getRequestId(), getRequestId());
  });
});

void describe("computeManageRequestSignature", () => {
  const requestId = "rid-1234567890";
  const navTimestamp = "20250601070809";
  const signatureKey = "signature-key";
  const operations = [
    { operation: "CREATE", data: Buffer.from("<InvoiceData>a</InvoiceData>").toString("base64") },
    { operation: "MODIFY", data: Buffer.from("<InvoiceData>b</InvoiceData>").toString("base64") },
  ];

  void it("is deterministic for the same input", () => {
    const first = computeManageRequestSignature(requestId, navTimestamp, signatureKey, operations);
    const second = computeManageRequestSignature(requestId, navTimestamp, signatureKey, operations);
    assert.equal(first, second);
  });

  void it("matches the NAV hash chain: sha3_512(reqId + ts + key + Σ sha3_512(op + data))", () => {
    const partialHash = requestId + navTimestamp + signatureKey;
    const indexHashes = operations.map((op) => sha3_512(op.operation + op.data));
    const expected = sha3_512(partialHash + indexHashes.join(""));
    assert.equal(computeManageRequestSignature(requestId, navTimestamp, signatureKey, operations), expected);
  });

  void it("changes when the invoice data changes", () => {
    const changed = operations.map((op, i) =>
      i === 0 ? { ...op, data: Buffer.from("<InvoiceData>different</InvoiceData>").toString("base64") } : op
    );
    assert.notEqual(
      computeManageRequestSignature(requestId, navTimestamp, signatureKey, operations),
      computeManageRequestSignature(requestId, navTimestamp, signatureKey, changed)
    );
  });

  void it("changes when the signature key changes", () => {
    assert.notEqual(
      computeManageRequestSignature(requestId, navTimestamp, signatureKey, operations),
      computeManageRequestSignature(requestId, navTimestamp, "other-key", operations)
    );
  });

  void it("changes when the requestId changes", () => {
    assert.notEqual(
      computeManageRequestSignature(requestId, navTimestamp, signatureKey, operations),
      computeManageRequestSignature("other-request-id", navTimestamp, signatureKey, operations)
    );
  });
});

void describe("decodeExchangeToken", () => {
  const exchangeKey = "testexchange00000"; // exactly 16 bytes

  void it("decodes an AES-128-ECB encrypted token (round trip)", () => {
    const plaintext = "token-1234-5678-9012";
    const encoded = aes128EcbEncrypt(exchangeKey, plaintext);
    assert.equal(decodeExchangeToken(encoded, exchangeKey), plaintext);
  });

  void it("uses only the first 16 bytes of the exchange key", () => {
    const longerKey = "testexchange00000-and-more";
    const encoded = aes128EcbEncrypt(exchangeKey, "payload");
    assert.equal(decodeExchangeToken(encoded, longerKey), "payload");
  });

  void it("strips null padding from the decrypted payload", () => {
    const plaintext = "token";
    const cipher = crypto.createCipheriv(
      "aes-128-ecb",
      Buffer.from(exchangeKey, "utf8").slice(0, 16),
      null
    );
    const padded = Buffer.concat([Buffer.from(plaintext, "utf8"), Buffer.alloc(16 - (plaintext.length % 16))]);
    const encoded = Buffer.concat([cipher.update(padded), cipher.final()]).toString("base64");
    assert.equal(decodeExchangeToken(encoded, exchangeKey), "token");
  });

  void it("throws a non-empty error for an invalid token", () => {
    assert.throws(() => decodeExchangeToken("not-valid-base64!!!", exchangeKey));
  });
});
