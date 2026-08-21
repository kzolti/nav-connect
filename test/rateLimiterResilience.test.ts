import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import NavConnect, { NavApiHttpError } from "../src/index.js";
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

const OK_QUERY_TAXPAYER = `<?xml version="1.0" encoding="UTF-8"?>
<QueryTaxpayerResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
</QueryTaxpayerResponse>`;

void describe("NavConnect request queue survives a failed throttled call", () => {
  let server: http.Server;
  let requestCount = 0;
  let url: string;

  before(async () => {
    server = http.createServer((_req, res) => {
      requestCount += 1;
      if (requestCount === 1) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("internal error");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(OK_QUERY_TAXPAYER);
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

  void it("still processes queued calls after previous call throws", async () => {
    const client = NavConnect.create({
      ...testConfig,
      minIntervalMs: 100,
      httpTimeoutMs: 5000,
      validateResponse: false,
      baseUrlOverride: url,
    });

    await assert.rejects(
      () => client.queryTaxpayer({ taxNumber: "12345678" }),
      (err: unknown) => {
        assert.ok(err instanceof NavApiHttpError, "expected a NavApiHttpError from the failed throttled call");
        assert.equal((err as NavApiHttpError).httpStatus, 500);
        return true;
      }
    );

    const second = await client.queryTaxpayer({ taxNumber: "12345678" });
    assert.equal(second.data.result.funcCode, "OK");

    assert.equal(requestCount, 2, "the failed call must not stall the queue");
  });
});