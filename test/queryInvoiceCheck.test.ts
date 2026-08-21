import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import NavConnect, { NavApiResponseError } from "../src/index.js";
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

const OK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<QueryInvoiceCheckResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:header>
    <common:requestId>${"R".repeat(30)}</common:requestId>
    <common:timestamp>2025-01-01T00:00:00.000Z</common:timestamp>
    <common:requestVersion>3.0</common:requestVersion>
  </common:header>
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
  <software>
    <softwareId>123456789012345678</softwareId>
    <softwareName>TestApp</softwareName>
    <softwareOperation>LOCAL_SOFTWARE</softwareOperation>
    <softwareMainVersion>1.0</softwareMainVersion>
    <softwareDevName>Dev</softwareDevName>
    <softwareDevContact>dev@test.com</softwareDevContact>
  </software>
  <invoiceCheckResult>true</invoiceCheckResult>
</QueryInvoiceCheckResponse>`;

const ERROR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<QueryInvoiceCheckResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>ERROR</common:funcCode>
    <common:errorCode>CHECK_ERROR</common:errorCode>
    <common:message>Invoice not found</common:message>
  </common:result>
</QueryInvoiceCheckResponse>`;

void describe("NavConnect queryInvoiceCheck", () => {
  let server: http.Server;
  let port: number;
  let url: string;
  let requestedBody: string;
  let requestCount: number;

  before(async () => {
    requestCount = 0;
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        requestedBody = body;
        requestCount++;
        res.writeHead(200, { "Content-Type": "application/xml" });
        if (requestCount > 1) {
          res.end(ERROR_XML);
        } else {
          res.end(OK_XML);
        }
      });
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

  void it("returns invoiceCheckResult for a valid reply", async () => {
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    const response = await client.queryInvoiceCheck({
      invoiceNumber: "T-2025/1",
      invoiceDirection: "OUTBOUND",
    });

    assert.equal(response.data.invoiceCheckResult, true);
    assert.equal(response.data.result?.funcCode, "OK");
    assert.ok(requestedBody.includes("<QueryInvoiceCheckRequest"));
    assert.ok(requestedBody.includes("<invoiceNumberQuery>"));
    assert.ok(requestedBody.includes("<invoiceNumber>T-2025/1</invoiceNumber>"));
    assert.ok(!("xmlValidationWarnings" in response), "valid response should not attach warnings");
  });

  void it("throws NavApiResponseError when the reply carries funcCode ERROR", async () => {
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await assert.rejects(
      () =>
        client.queryInvoiceCheck({
          invoiceNumber: "UNKNOWN/1",
          invoiceDirection: "OUTBOUND",
        }),
      (err: unknown) => {
        assert.ok(err instanceof NavApiResponseError);
        assert.equal((err as NavApiResponseError).errorCode, "CHECK_ERROR");
        assert.equal((err as NavApiResponseError).funcCode, "ERROR");
        return true;
      }
    );
  });
});