import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import NavConnect, { NavApiError } from "../src/index.js";
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

const UNEXPECTED_ROOT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<SomethingElse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api">
  <foo>bar</foo>
</SomethingElse>`;

const MISSING_TOKEN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TokenExchangeResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
</TokenExchangeResponse>`;

void describe("NavConnect tokenExchange error handling", () => {
  let server: http.Server;
  let port: number;
  let url: string;
  let responseXml: string;

  before(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(responseXml);
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

  void it("throws NavApiError (not TypeError) when the reply has an unexpected root element", async () => {
    responseXml = UNEXPECTED_ROOT_XML;
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await assert.rejects(
      () => client.tokenExchange(),
      (err: unknown) => {
        assert.ok(err instanceof NavApiError, `expected NavApiError, got ${(err as Error)?.constructor?.name}`);
        assert.ok((err as Error).message.includes("Unexpected NAV response"));
        return true;
      }
    );
  });

  void it("throws NavApiError when the reply is missing encodedExchangeToken", async () => {
    responseXml = MISSING_TOKEN_XML;
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await assert.rejects(
      () => client.tokenExchange(),
      (err: unknown) => {
        assert.ok(err instanceof NavApiError, `expected NavApiError, got ${(err as Error)?.constructor?.name}`);
        assert.ok((err as Error).message.includes("missing encodedExchangeToken"));
        return true;
      }
    );
  });
});

// XSD-invalid but well-formed response: validating it produces warnings,
// skipping validation must not.
const SCHEMA_INVALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<QueryTaxpayerResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
</QueryTaxpayerResponse>`;

void describe("NavConnect validateResponse option", () => {
  let server: http.Server;
  let port: number;
  let url: string;

  before(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(SCHEMA_INVALID_XML);
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

  void it("attaches no xmlValidationWarnings by default", async () => {
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    const response = await client.queryTaxpayer({ taxNumber: "12345678" });

    assert.ok(!("xmlValidationWarnings" in response), "no warnings expected with validation disabled by default");
  });

  void it("attaches xmlValidationWarnings when validateResponse is true", async () => {
    const client = NavConnect.create({
      ...testConfig,
      baseUrlOverride: url,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
      validateResponse: true,
    });

    const response = await client.queryTaxpayer({ taxNumber: "12345678" });

    assert.ok(
      response.xmlValidationWarnings && response.xmlValidationWarnings.length > 0,
      "schema-invalid response should produce warnings"
    );
  });

  void it("skips response validation when validateResponse is false", async () => {
    const client = NavConnect.create({
      ...testConfig,
      baseUrlOverride: url,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
      validateResponse: false,
    });

    const response = await client.queryTaxpayer({ taxNumber: "12345678" });

    assert.ok(!("xmlValidationWarnings" in response), "no warnings expected with validation disabled");
  });
});