import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
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

const ANNULMENT_DATA = Buffer.from('<?xml version="1.0" encoding="UTF-8"?><InvoiceAnnulment>fake</InvoiceAnnulment>').toString(
  "base64"
);

const OK_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<ManageAnnulmentResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
  <transactionId>TRANS-2025-0002</transactionId>
</ManageAnnulmentResponse>`;

void describe("NavConnect manageAnnulment pre-flight validation", () => {
  void it("throws when annulmentOperations is empty", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    await assert.rejects(
      () => client.manageAnnulment({ annulmentOperations: [] }),
      (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("at least one item")
    );
  });

  void it("throws when an index is not an integer between 1 and 100", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    for (const badIndex of [0, 101, 1.5, -3]) {
      await assert.rejects(
        () =>
          client.manageAnnulment({
            annulmentOperations: [{ index: badIndex, annulmentOperation: "ANNUL", invoiceAnnulment: ANNULMENT_DATA }],
          }),
        (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("between 1 and 100")
      );
    }
  });

  void it("throws when indices are not strictly sequential without gaps", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    await assert.rejects(
      () =>
        client.manageAnnulment({
          annulmentOperations: [
            { index: 1, annulmentOperation: "ANNUL", invoiceAnnulment: ANNULMENT_DATA },
            { index: 3, annulmentOperation: "ANNUL", invoiceAnnulment: ANNULMENT_DATA },
          ],
        }),
      (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("strictly increasing")
    );
  });
});

void describe("NavConnect manageAnnulment submission", () => {
  let server: http.Server;
  let url: string;
  let requests: { path: string; body: string }[] = [];

  const exchangeKey = "testexchange00000";
  const plaintextToken = "auto-obtained-token-123";

  before(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        requests.push({ path: req.url ?? "", body });
        if (req.url === "/tokenExchange") {
          const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(exchangeKey, "utf8").slice(0, 16), null);
          const encoded = Buffer.concat([
            cipher.update(Buffer.from(plaintextToken, "utf8")),
            cipher.final(),
          ]).toString("base64");
          res.writeHead(200, { "Content-Type": "application/xml" });
          res.end(
            `<?xml version="1.0" encoding="UTF-8"?>
<TokenExchangeResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result><common:funcCode>OK</common:funcCode></common:result>
  <encodedExchangeToken>${encoded}</encodedExchangeToken>
  <tokenValidityFrom>2025-06-01T00:00:00.000Z</tokenValidityFrom>
  <tokenValidityTo>2025-06-02T00:00:00.000Z</tokenValidityTo>
</TokenExchangeResponse>`
          );
          return;
        }
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

  void it("obtains the exchange token automatically and submits the annulment", async () => {
    requests = [];
    const client = NavConnect.create({
      ...testConfig,
      technicalUser: { ...testConfig.technicalUser, exchangeKey },
      baseUrlOverride: url,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
    });

    const response = await client.manageAnnulment({
      annulmentOperations: [
        { index: 1, annulmentOperation: "ANNUL", invoiceAnnulment: ANNULMENT_DATA },
        { index: 2, annulmentOperation: "ANNUL", invoiceAnnulment: ANNULMENT_DATA },
      ],
    });

    assert.equal(response.data.transactionId, "TRANS-2025-0002");
    assert.equal(response.data.result?.funcCode, "OK");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].path, "/tokenExchange");

    const managePath = requests[1].path;
    assert.equal(managePath, "/manageAnnulment");
    const body = requests[1].body;
    assert.ok(body.includes("<ManageAnnulmentRequest"));
    assert.ok(body.includes(`<exchangeToken>${plaintextToken}</exchangeToken>`));
    assert.ok(body.includes("<index>1</index>"));
    assert.ok(body.includes("<index>2</index>"));
    assert.equal((body.match(/<annulmentOperation>ANNUL<\/annulmentOperation>/g) ?? []).length, 2);
  });

  void it("uses the provided exchangeToken without calling tokenExchange", async () => {
    requests = [];
    const client = NavConnect.create({
      ...testConfig,
      technicalUser: { ...testConfig.technicalUser, exchangeKey },
      baseUrlOverride: url,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
    });

    await client.manageAnnulment({
      annulmentOperations: [{ index: 1, annulmentOperation: "ANNUL", invoiceAnnulment: ANNULMENT_DATA }],
      exchangeToken: "provided-token",
    });

    assert.equal(requests.length, 1);
    assert.ok(requests[0].body.includes("<exchangeToken>provided-token</exchangeToken>"));
  });
});