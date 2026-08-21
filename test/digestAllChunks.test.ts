import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawnSync } from "node:child_process";
import NavConnect, { NavApiError } from "../src/index.js";
import type { NavApiConfig } from "../src/index.js";
import { buildDigestChunks } from "../src/dateRange.js";

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

const OK_DIGEST_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<QueryInvoiceDigestResponse xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">
  <common:result>
    <common:funcCode>OK</common:funcCode>
  </common:result>
  <invoiceDigestResult>
    <availablePage>1</availablePage>
    <currentPage>1</currentPage>
  </invoiceDigestResult>
</QueryInvoiceDigestResponse>`;

void describe("NavConnect digestAll chunk boundaries", () => {
  const intervals: { from: string; to: string }[] = [];
  let server: http.Server;
  let url: string;

  before(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        const from = body.match(/<dateTimeFrom>([^<]*)<\/dateTimeFrom>/)?.[1] ?? "";
        const to = body.match(/<dateTimeTo>([^<]*)<\/dateTimeTo>/)?.[1] ?? "";
        intervals.push({ from, to });
        res.writeHead(200, { "Content-Type": "application/xml" });
        res.end(OK_DIGEST_RESPONSE);
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

  void it("splits ranges > 35 days without overlapping or gap at the chunk boundary", async () => {
    const client = NavConnect.create({
      ...testConfig,
      minIntervalMs: 0,
      httpTimeoutMs: 5000,
      validateResponse: false,
      baseUrlOverride: url,
    });

    const from = "2026-01-01T00:00:00.000Z";
    const to = "2026-02-05T12:00:00.000Z";

    const digests = await client.queryInvoiceDigestAll({

      insDate: { dateTimeFrom: from, dateTimeTo: to },
      invoiceDirectionType: "OUTBOUND",
      throttleMs: 0,
    });

    assert.equal(digests.length, 0);
    assert.equal(intervals.length, 2, "35 days + margin must produce exactly 2 chunks");

    const [first, second] = intervals;
    assert.equal(first.from, from, "first chunk starts at the requested from");
    assert.equal(first.to, "2026-02-05T00:00:00.000Z", "first chunk covers exactly 35 days");
    assert.equal(second.from, "2026-02-05T00:00:00.001Z", "second chunk starts 1 ms after the first ends (no overlap, no gap)");
    assert.equal(second.to, to, "last chunk ends at the requested to");
  });
});

void describe("NavConnect date range validation", () => {
  let server: http.Server;
  let url: string;

  before(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(OK_DIGEST_RESPONSE);
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

  void it("queryInvoiceDigest throws when dateTimeFrom is later than dateTimeTo", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: url });

    await assert.rejects(
      () =>
        client.queryInvoiceDigest({
          page: 1,
          invoiceDirectionType: "OUTBOUND",
          insDate: {
            dateTimeFrom: "2026-02-01T00:00:00.000Z",
            dateTimeTo: "2026-01-01T00:00:00.000Z",
          },
        }),
      (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("must not be later")
    );
  });

  void it("queryInvoiceDigestAll throws on invalid dates instead of returning an empty array", async () => {
    const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: url });

    await assert.rejects(
      () =>
        client.queryInvoiceDigestAll({
          insDate: {
            dateTimeFrom: "not-a-date",
            dateTimeTo: "2026-02-01T00:00:00.000Z",
          },
          invoiceDirectionType: "OUTBOUND",
        }),
      (err: unknown) => err instanceof NavApiError && (err as Error).message.includes("not a valid date")
    );
  });

  void it("queryInvoiceDigestAll handles ranges spanning more than 70 days without NavDateRangeError", async () => {
    const intervals: { from: string; to: string }[] = [];
    const chunkServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        const from = body.match(/<dateTimeFrom>([^<]*)<\/dateTimeFrom>/)?.[1] ?? "";
        const to = body.match(/<dateTimeTo>([^<]*)<\/dateTimeTo>/)?.[1] ?? "";
        intervals.push({ from, to });
        res.writeHead(200, { "Content-Type": "application/xml" });
        res.end(OK_DIGEST_RESPONSE);
      });
    });
    await new Promise<void>((resolve) => {
      chunkServer.listen(0, () => {
        const port = (chunkServer.address() as import("net").AddressInfo).port;
        url = `http://localhost:${port}`;
        resolve();
      });
    });

    try {
      const client = NavConnect.create({ ...testConfig, minIntervalMs: 0, httpTimeoutMs: 5000, baseUrlOverride: url });

      const digests = await client.queryInvoiceDigestAll({
        insDate: {
          dateTimeFrom: "2026-01-01T00:00:00.000Z",
          dateTimeTo: "2026-04-11T00:00:00.000Z",
        },
        invoiceDirectionType: "OUTBOUND",
        throttleMs: 0,
      });

      assert.equal(digests.length, 0);
      assert.equal(intervals.length, 3, "100 days must produce exactly 3 chunks");
      assert.equal(intervals[0].from, "2026-01-01T00:00:00.000Z");
      assert.equal(intervals[0].to, "2026-02-05T00:00:00.000Z");
      assert.equal(intervals[1].from, "2026-02-05T00:00:00.001Z");
      assert.equal(intervals[1].to, "2026-03-12T00:00:00.001Z");
      assert.equal(intervals[2].from, "2026-03-12T00:00:00.002Z");
      assert.equal(intervals[2].to, "2026-04-11T00:00:00.000Z");
    } finally {
      await new Promise<void>((resolve) => chunkServer.close(() => resolve()));
    }
  });
});

void describe("buildDigestChunks DST safety", () => {
  const DAY_MS = 1000 * 60 * 60 * 24;

  void it("produces exactly 35-day chunks in UTC terms (timezone-independent invariant)", () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const to = new Date("2026-12-15T00:00:00.000Z");
    const chunks = buildDigestChunks(from, to);

    assert.ok(chunks.length > 1, "a multi-month range must split into several chunks");
    for (let i = 0; i < chunks.length; i++) {
      const span = new Date(chunks[i].to).getTime() - new Date(chunks[i].from).getTime();
      if (i < chunks.length - 1) {
        assert.equal(span, 35 * DAY_MS, `chunk ${i + 1} must be exactly 35 days`);
      }
      assert.ok(span <= 35 * DAY_MS, `chunk ${i + 1} must not exceed 35 days`);
      if (i > 0) {
        assert.equal(
          new Date(chunks[i].from).getTime() - new Date(chunks[i - 1].to).getTime(),
          1,
          "chunks must be contiguous (1 ms apart)"
        );
      }
    }
    assert.equal(chunks[chunks.length - 1].to, to.toISOString(), "last chunk must end at the requested to");
  });

  void it("does not throw NavDateRangeError across a DST fall-back boundary (TZ=Europe/Budapest)", () => {
    const dateRangeUrl = new URL("../src/dateRange.ts", import.meta.url).href;
    const script = `
      import { buildDigestChunks, parseDateTimeInterval, assertRangeWithinLimit } from ${JSON.stringify(dateRangeUrl)};
      const chunks = buildDigestChunks(new Date("2026-10-01T00:00:00.000Z"), new Date("2026-11-20T00:00:00.000Z"));
      for (const c of chunks) {
        const { from, to } = parseDateTimeInterval({ dateTimeFrom: c.from, dateTimeTo: c.to }, "chunk");
        assertRangeWithinLimit(from, to);
      }
      console.log("OK:" + chunks.length);
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      env: { ...process.env, TZ: "Europe/Budapest" },
      encoding: "utf8",
    });

    assert.equal(result.status, 0, `child process failed:\n${result.stderr}`);
    assert.match(result.stdout, /OK:\d+/, `unexpected output:\n${result.stdout}`);
  });
});