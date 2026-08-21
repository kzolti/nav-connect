import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import NavConnect, { NavXmlValidationError } from "../src/index.js";
import type { NavApiConfig } from "../src/index.js";

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

const OK_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<QueryTaxpayerResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
</QueryTaxpayerResponse>`;

void describe("NavConnect request XML building (integration)", () => {
  let server: http.Server;
  let url: string;
  let requestedBody: string;
  let requestCount: number;

  before(async () => {
    requestCount = 0;
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        requestedBody = body;
        requestCount++;
        res.writeHead(200, { "Content-Type": "application/xml" });
        res.end(OK_RESPONSE);
      });
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

  void it("builds valid request XML and posts it to the API", async () => {
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await client.queryTaxpayer({ taxNumber: "12345678" });

    assert.ok(requestedBody.includes("<QueryTaxpayerRequest"));
    assert.ok(requestedBody.includes("<common:header>"));
    assert.ok(requestedBody.includes("<common:requestId>"));
    assert.ok(requestedBody.includes("<common:user>"));
    assert.ok(requestedBody.includes("<software>"));
    assert.ok(!requestedBody.includes("common:software"));
  });

  void it("throws NavXmlValidationError before any network call for an invalid request", async () => {
    requestCount = 0;
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await assert.rejects(
      () =>
        client.queryInvoiceDigest({
          page: "not-a-number" as unknown as number,
          invoiceDirectionType: "OUTBOUND",
          insDate: {
            dateTimeFrom: "2025-01-01T00:00:00.000Z",
            dateTimeTo: "2025-01-02T00:00:00.000Z",
          },
        }),
      (err: unknown) => {
        assert.ok(err instanceof NavXmlValidationError, `expected NavXmlValidationError, got ${(err as Error)?.constructor?.name}`);
        assert.ok((err as NavXmlValidationError).validationErrors.length > 0);
        return true;
      }
    );

    assert.equal(requestCount, 0, "no HTTP request may be sent for an XSD-invalid request");
  });
});