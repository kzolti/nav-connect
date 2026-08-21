import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import NavConnect, { NavApiError, NavXmlValidationError } from "../src/index.js";
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

const INVOICE_DATA = Buffer.from('<?xml version="1.0" encoding="UTF-8"?><InvoiceData>fake</InvoiceData>').toString(
  "base64"
);

const OK_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<ManageInvoiceResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
  <transactionId>TRANS-2025-0001</transactionId>
</ManageInvoiceResponse>`;

void describe("NavConnect manageInvoice pre-flight validation", () => {
  void it("throws when invoiceOperation is empty", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    await assert.rejects(
      () => client.manageInvoice({ invoiceOperation: [], compressedContent: false, skipXmlValidation: true }),
      (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("at least one item")
    );
  });

  void it("throws when an index is not an integer between 1 and 100", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    for (const badIndex of [0, 101, 1.5, -3]) {
      await assert.rejects(
        () =>
          client.manageInvoice({
            invoiceOperation: [{ index: badIndex, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA }],
            compressedContent: false,
            skipXmlValidation: true,
          }),
        (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("between 1 and 100")
      );
    }
  });

  void it("throws when indices are not strictly sequential without gaps", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    await assert.rejects(
      () =>
        client.manageInvoice({
          invoiceOperation: [
            { index: 1, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA },
            { index: 3, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA },
          ],
          compressedContent: false,
          skipXmlValidation: true,
        }),
      (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("strictly increasing")
    );
  });

  void it("throws when compressedContent is set but validation is not skipped", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    await assert.rejects(
      () =>
        client.manageInvoice({
          invoiceOperation: [{ index: 1, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA }],
          compressedContent: true,
          skipXmlValidation: false,
        }),
      (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("Compressed content")
    );
  });

  void it("throws NavXmlValidationError before any network call when invoice XML is invalid", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: "http://127.0.0.1:1" });
    await assert.rejects(
      () =>
        client.manageInvoice({
          invoiceOperation: [
            {
              index: 1,
              invoiceOperation: "CREATE",
              invoiceData: Buffer.from('<InvoiceData></InvoiceData>').toString("base64"),
            },
          ],
          compressedContent: false,
          skipXmlValidation: false,
        }),
      (err: unknown) => err instanceof NavXmlValidationError
    );
  });
});

void describe("NavConnect manageInvoice submission", () => {
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

  void it("obtains the exchange token automatically and signs the request correctly", async () => {
    requests = [];
    const client = NavConnect.create({
      ...testConfig,
      technicalUser: { ...testConfig.technicalUser, exchangeKey },
      baseUrlOverride: url,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
      validateResponse: false,
    });

    const response = await client.manageInvoice({
      invoiceOperation: [{ index: 1, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA }],
      compressedContent: false,
      skipXmlValidation: true,
    });

    assert.equal(response.data.transactionId, "TRANS-2025-0001");
    assert.equal(requests.length, 2, "token exchange + manageInvoice expected");
    assert.equal(requests[0].path, "/tokenExchange");
    assert.equal(requests[1].path, "/manageInvoice");

    const body = requests[1].body;
    assert.ok(body.includes("<ManageInvoiceRequest"));
    assert.ok(body.includes(`<exchangeToken>${plaintextToken}</exchangeToken>`), "decoded token must be reused");
    assert.ok(body.includes("<compressedContent>false</compressedContent>"));
    assert.ok(body.includes("<invoiceOperation>CREATE</invoiceOperation>"));
    assert.ok(body.includes(`<invoiceData>${INVOICE_DATA}</invoiceData>`));

    const requestId = body.match(/<common:requestId>([^<]*)<\/common:requestId>/)?.[1];
    const timestamp = body.match(/<common:timestamp>([^<]*)<\/common:timestamp>/)?.[1];
    const signature = body.match(/<common:requestSignature[^>]*>([^<]*)<\/common:requestSignature>/)?.[1];
    assert.ok(requestId && timestamp && signature, "requestId/timestamp/signature must be present");

    const formatNavTs = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return (
        d.getUTCFullYear() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds())
      );
    };

    const expected = crypto
      .createHash("sha3-512")
      .update(
        requestId +
          formatNavTs(timestamp) +
          testConfig.technicalUser.signatureKey +
          crypto.createHash("sha3-512").update("CREATE" + INVOICE_DATA).digest("hex").toUpperCase()
      )
      .digest("hex")
      .toUpperCase();

    assert.equal(signature, expected, "requestSignature must match the NAV hash chain");
  });

  void it("uses the provided exchangeToken without calling tokenExchange", async () => {
    requests = [];
    const client = NavConnect.create({
      ...testConfig,
      baseUrlOverride: url,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
      validateResponse: false,
    });

    await client.manageInvoice({
      invoiceOperation: [{ index: 1, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA }],
      compressedContent: false,
      skipXmlValidation: true,
      exchangeToken: "explicit-token",
    });

    assert.equal(requests.length, 1, "only manageInvoice expected");
    assert.equal(requests[0].path, "/manageInvoice");
    assert.ok(requests[0].body.includes("<exchangeToken>explicit-token</exchangeToken>"));
  });

  void it("handles a multi-item batch with sequential indices", async () => {
    requests = [];
    const client = NavConnect.create({
      ...testConfig,
      technicalUser: { ...testConfig.technicalUser, exchangeKey },
      baseUrlOverride: url,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
      validateResponse: false,
    });

    await client.manageInvoice({
      invoiceOperation: [
        { index: 1, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA },
        { index: 2, invoiceOperation: "CREATE", invoiceData: INVOICE_DATA },
      ],
      compressedContent: false,
      skipXmlValidation: true,
      exchangeToken: "explicit-token",
    });

    const body = requests[0].body;
    assert.equal((body.match(/<index>(\d+)<\/index>/g) ?? []).length, 2);
    assert.ok(body.includes("<index>1</index>"));
    assert.ok(body.includes("<index>2</index>"));
  });
});
