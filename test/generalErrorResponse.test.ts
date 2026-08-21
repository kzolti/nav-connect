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

const GENERAL_ERROR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GeneralErrorResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>ERROR</common:funcCode>
    <common:errorCode>INVALID_USER_OR_PASSWORD</common:errorCode>
    <common:message>User or password invalid</common:message>
  </common:result>
  <software>
    <softwareId>123456789012345678</softwareId>
    <softwareName>TestApp</softwareName>
    <softwareOperation>LOCAL_SOFTWARE</softwareOperation>
    <softwareMainVersion>1.0</softwareMainVersion>
    <softwareDevName>Dev</softwareDevName>
    <softwareDevContact>dev@test.com</softwareDevContact>
  </software>
  <technicalValidationMessages>
    <validationResultCode>CRITICAL</validationResultCode>
    <validationErrorCode>ERR-1</validationErrorCode>
    <message>detailed technical failure</message>
  </technicalValidationMessages>
</GeneralErrorResponse>`;

void describe("NavConnect GeneralErrorResponse (HTTP 200)", () => {
  let server: http.Server;
  let port: number;
  let url: string;

  before(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(GENERAL_ERROR_XML);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as import("net").AddressInfo).port;
        url = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  void it("throws NavApiResponseError with structured data on tokenExchange", async () => {
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await assert.rejects(
      () => client.tokenExchange(),
      (err: unknown) => {
        assert.ok(err instanceof NavApiResponseError, `expected NavApiResponseError, got ${(err as Error)?.constructor?.name}`);
        const navErr = err as NavApiResponseError;
        assert.equal(navErr.funcCode, "ERROR");
        assert.equal(navErr.errorCode, "INVALID_USER_OR_PASSWORD");
        assert.ok(navErr.message.includes("User or password invalid"));
        assert.equal(navErr.httpStatus, 200);
        assert.equal(navErr.technicalValidationMessages?.length, 1);
        assert.equal(navErr.technicalValidationMessages?.[0].validationErrorCode, "ERR-1");
        return true;
      }
    );
  });

  void it("throws NavApiResponseError on query methods too", async () => {
    const client = NavConnect.create({ ...testConfig, baseUrlOverride: url, minIntervalMs: 0, httpTimeoutMs: 5000 });

    await assert.rejects(
      () => client.queryTaxpayer({ taxNumber: "12345678" }),
      (err: unknown) => {
        assert.ok(err instanceof NavApiResponseError);
        assert.equal((err as NavApiResponseError).errorCode, "INVALID_USER_OR_PASSWORD");
        return true;
      }
    );
  });
});