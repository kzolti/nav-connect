import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import NavConnect, { NavApiTimeoutError } from "../src/index.js";
import type { NavApiConfig } from "../src/index.js";

function createTestToken(exchangeKey: string, plaintext: string): string {
  const keyBuffer = Buffer.from(exchangeKey, "utf8").slice(0, 16);
  const cipher = crypto.createCipheriv("aes-128-ecb", keyBuffer, null);
  return Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]).toString("base64");
}

const testConfig: NavApiConfig = {
  testSystem: true,
  taxNumber: "12345678",
  technicalUser: {
    user: "testuser",
    password: "testpassword",
    signatureKey: "testsignaturekey",
    exchangeKey: "testexchange00000", // exactly 16 bytes for AES-128
  },
  software: {
    softwareId: "123456789012345678",
    softwareName: "TestApp",
    softwareOperation: "LOCAL_SOFTWARE",
    softwareMainVersion: "1.0",
    softwareDevName: "Dev",
    softwareDevContact: "dev@test.com",
  },
};

void describe("NavConnect rate limiter", () => {
  const timestamps: number[] = [];
  let server: http.Server;
  let port: number;
  let url: string;

  before(async () => {
    server = http.createServer((_req, res) => {
      timestamps.push(Date.now());
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end("<root/>");
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as import("net").AddressInfo).port;
        url = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  void it("enforces minIntervalMs between requests", async () => {
    const intervalMs = 200;
    const client = NavConnect.create({ ...testConfig, minIntervalMs: intervalMs, baseUrlOverride: url, httpTimeoutMs: 5000 });

    timestamps.length = 0;

    await Promise.allSettled([
      client.queryTaxpayer({ taxNumber: "12345678" }),
      client.queryTaxpayer({ taxNumber: "12345678" }),
      client.queryTaxpayer({ taxNumber: "12345678" }),
    ]);

    assert.equal(timestamps.length, 3, "server should have received 3 requests");
    // Dispatch-to-dispatch is paced to exactly intervalMs; per-request server
    // scheduling jitter can skew individual arrival gaps, so assert on the
    // total span from the first to the last arrival with a generous tolerance.
    const span = timestamps[2] - timestamps[0];
    assert.ok(
      span >= 2 * intervalMs - 100,
      `span ${span}ms should be >= ${2 * intervalMs - 100}ms`
    );
  });

  void it("respects minIntervalMs=0 (no rate limiting)", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, baseUrlOverride: url, httpTimeoutMs: 5000 });

    timestamps.length = 0;

    const start = Date.now();
    await Promise.allSettled([
      client.queryTaxpayer({ taxNumber: "12345678" }),
      client.queryTaxpayer({ taxNumber: "12345678" }),
      client.queryTaxpayer({ taxNumber: "12345678" }),
    ]);
    const elapsed = Date.now() - start;

    assert.equal(timestamps.length, 3, "server should have received 3 requests");
    assert.ok(elapsed < 200, `all requests should complete quickly (<200ms), took ${elapsed}ms`);
  });
});

void describe("NavConnect timeout", () => {
  let server: http.Server;
  let port: number;
  let url: string;

  before(async () => {
    server = http.createServer((_req, res) => {
      // never respond — client should time out
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as import("net").AddressInfo).port;
        url = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  void it("throws NavApiTimeoutError when httpTimeoutMs is exceeded", async () => {
    const client = NavConnect.create({ ...testConfig, httpTimeoutMs: 100, minIntervalMs: 0, baseUrlOverride: url });

    await assert.rejects(
      () => client.queryTaxpayer({ taxNumber: "12345678" }),
      (err: unknown) => {
        assert.ok(err instanceof NavApiTimeoutError);
        assert.equal((err as NavApiTimeoutError).timeoutMs, 100);
        return true;
      }
    );
  });
});

void describe("NavConnect tokenExchange", () => {
  let server: http.Server;
  let port: number;
  let url: string;
  const exchangeKey = "testexchange00000";

  before(async () => {
    server = http.createServer((_req, res) => {
      const tokenData = JSON.stringify({ sub: "test-token", iat: Date.now() });
      const encodedToken = createTestToken(exchangeKey, tokenData);

      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
<TokenExchangeResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
  <encodedExchangeToken>${encodedToken}</encodedExchangeToken>
  <tokenValidityFrom>2025-06-01T00:00:00.000Z</tokenValidityFrom>
  <tokenValidityTo>2025-06-02T00:00:00.000Z</tokenValidityTo>
</TokenExchangeResponse>`);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as import("net").AddressInfo).port;
        url = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  void it("returns token, tokenValidityFrom, tokenValidityTo", async () => {
    const client = NavConnect.create({
      ...testConfig,
      technicalUser: { ...testConfig.technicalUser, exchangeKey },
      baseUrlOverride: url,
      httpTimeoutMs: 5000,
      minIntervalMs: 0,
    });

    const result = await client.tokenExchange();

    assert.ok(typeof result.token === "string");
    assert.ok(result.token.length > 0);
    assert.equal(result.tokenValidityFrom, "2025-06-01T00:00:00.000Z");
    assert.equal(result.tokenValidityTo, "2025-06-02T00:00:00.000Z");
  });
});
