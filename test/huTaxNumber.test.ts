import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import NavConnect, { NavTaxNumberValidationError } from "../src/index.js";
import type { NavApiConfig } from "../src/index.js";
import { validateHuTaxNumber } from "../src/huTaxNumber.js";

const testConfig: NavApiConfig = {
  testSystem: true,
  taxNumber: "12345678",
  technicalUser: {
    user: "testuser",
    password: "testpassword",
    signatureKey: "testsignaturekey",
    exchangeKey: "testexchange00000",
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

void describe("validateHuTaxNumber", () => {
  void it("accepts CDV-valid trunks", () => {
    assert.deepEqual(validateHuTaxNumber("15789934"), { valid: true });
    assert.deepEqual(validateHuTaxNumber("11160579"), { valid: true });
  });

  void it("rejects bad format (trunk only, no trimming, no full forms)", () => {
    for (const bad of ["", "1234567", "123456789", "abcdefgh", "11161563 ", " 11161563", "11161563-2-10", "11161563-2"]) {
      const result = validateHuTaxNumber(bad);
      assert.equal(result.valid, false, `${bad} should be invalid`);
      assert.equal(result.errorCode, "TAX_NUMBER_INVALID_FORMAT", `${bad} should be a format error`);
    }
  });

  void it("rejects invalid check digit", () => {
    for (const bad of ["12345678", "87654321", "11111112"]) {
      const result = validateHuTaxNumber(bad);
      assert.equal(result.valid, false, `${bad} should be invalid`);
      assert.equal(result.errorCode, "TAX_NUMBER_INVALID_CHECK_DIGIT", `${bad} should be a check-digit error`);
    }
  });
});

void describe("queryTaxpayer CDV guard", () => {
  let server: http.Server;
  let url: string;
  let requestCount: number;

  before(async () => {
    requestCount = 0;
    server = http.createServer((_req, res) => {
      requestCount++;
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end("<root/>");
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const port = (server.address() as import("net").AddressInfo).port;
        url = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  void it("throws NavTaxNumberValidationError before any network call", async () => {
    requestCount = 0;
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await assert.rejects(
      () => client.queryTaxpayer({ taxNumber: "12345678" }),
      (err: unknown) => {
        assert.ok(err instanceof NavTaxNumberValidationError, `expected NavTaxNumberValidationError, got ${(err as Error)?.constructor?.name}`);
        const navErr = err as NavTaxNumberValidationError;
        assert.equal(navErr.errorCode, "TAX_NUMBER_INVALID_CHECK_DIGIT");
        assert.equal(navErr.statusCode, 400);
        return true;
      }
    );

    assert.equal(requestCount, 0, "no HTTP request may be sent for a CDV-invalid tax number");
  });
});
