# NAV Connect

Node.js client library for the Hungarian Tax Authority's (NAV) Online Invoice System API v3.0.

## Installation

```bash
npm install nav-connect nav-osa-types
```

## Requirements

- Node.js >= 20.11.0 (required by `nav-osa-core`)
- NAV Online Invoice System credentials (technical user, exchangeKey, signatureKey)

## Usage

```typescript
import NavConnect from 'nav-connect';

const navClient = NavConnect.create({
  testSystem: true,
  taxNumber: '12345678',
  technicalUser: {
    user: 'yourUserName',
    password: 'yourPassword',
    signatureKey: 'yourSignatureKey',
    exchangeKey: 'yourExchangeKey'
  },
  software: {
    softwareId: 'YOUR-SOFTWARE-ID',
    softwareName: 'YourSoftwareName',
    softwareOperation: 'LOCAL_SOFTWARE',
    softwareMainVersion: '1.0.0',
    softwareDevName: 'Your Name',
    softwareDevContact: 'your@email.com',
    softwareDevCountryCode: 'HU',
    softwareDevTaxNumber: '12345678'
  },
  httpTimeoutMs: 55_000,    // optional, default 55_000
  // minIntervalMs: 1000   // opt-in rate limiter (1 req/s) — not required by NAV v3
  // validateResponse: true // optional, XSD-validate every response (default false)
});
```

## Dependencies

- [`nav-osa-core`](https://github.com/kzolti/nav-osa-core) — XML building, XSD validation, parsing
- [`nav-osa-types`](https://github.com/kzolti/nav-osa-types) — TypeScript type definitions (peer dependency)

Both packages must be installed separately. XSD loading and validation in `nav-osa-core` happens lazily on first use.

## Request validation

Every API call validates the request XML against the built-in XSD schemas **before** any network activity. If validation fails, an error is thrown immediately — no token exchange, no HTTP request.

Response XML is validated against the invoice API schema only when `validateResponse: true` is set (default is `false` for throughput). Violations are reported as `xmlValidationWarnings` on the response (never thrown).

## Rate limiting & timeout

### Per-instance request queue (opt-in)

The rate limiter can be enabled via `minIntervalMs`:

```typescript
const navClient = NavConnect.create({
  // ... config
  minIntervalMs: 1000, // 1 req/s serialization
});
```

When enabled, all API calls are serialized with the configured interval. Default is `0` — no rate limiting.

### HTTP timeout

The configured `httpTimeoutMs` (default `55_000` ms) is passed to the underlying axios client. If no response arrives within this window, a `NavApiTimeoutError` is thrown.

Per the NAV spec (§1.6.6):
- Typical response time is < 200 ms
- A timeout does **not** mean the submission failed — use `queryTransactionList` for recovery
- Hard NAV-side timeout is 60 seconds; the client default of 55 s is a soft limit below that

### Per-method throttle

`queryInvoiceDigestAll()` has its own `throttleMs` parameter (default `5000` ms) for pagination across large date ranges, independent of the per-instance rate limiter.

## API

All API methods return `NavApiResponse<T>`:

```typescript
import type { NavApiResponse } from 'nav-connect';

interface NavApiResponse<T> {
  data: T;                     // The NAV API response object
  xmlValidationWarnings?: string[];  // XSD validation warnings (if any)
}
```

### Instance getters

```typescript
console.log(navClient.taxNumber);      // "12345678" — the configured tax number
console.log(navClient.testSystem);     // true — whether test system is enabled
console.log(navClient.technicalUser);  // "yourUserName" — the configured technical user
```

### queryInvoiceDigest

Query invoice digests for a date range (max 35 days). Throws `NavDateRangeError` if the range exceeds 35 days.

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { QueryInvoiceDigestResponse } from 'nav-osa-types';

const response: NavApiResponse<QueryInvoiceDigestResponse> = await navClient.queryInvoiceDigest({
  page: 1,
  invoiceDirectionType: "OUTBOUND",
  insDate: {
    dateTimeFrom: "2025-06-01T00:00:00Z",
    dateTimeTo: "2025-06-30T23:59:59Z",
  },
});

console.log(response.data.invoiceDigestResult[0].invoiceDigest);
```

### queryInvoiceDigestAll

Query invoice digests for arbitrary date ranges. Automatically splits into 35-day chunks, paginates, and throttles API calls. Throws `NavApiError` if `dateTimeFrom` is later than `dateTimeTo`.

```typescript
import type { InvoiceDigestType } from 'nav-osa-types';

const digests: InvoiceDigestType[] = await navClient.queryInvoiceDigestAll({
  invoiceDirectionType: "INBOUND",
  insDate: {
    dateTimeFrom: "2025-01-01T00:00:00Z",
    dateTimeTo: "2025-06-01T00:00:00Z",
  },
  throttleMs: 7000,
  onProgress: (p: DigestAllProgress) => {
    console.log(
      `Chunk ${p.currentChunk}/${p.totalChunks}, ` +
      `page ${p.currentPage}/${p.availablePages}, ` +
      `collected: ${p.digestsCollected}`
    );
  },
});
```

### queryInvoiceData

Query specific invoice data by invoice number.

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { QueryInvoiceDataResponse } from 'nav-osa-types';

const response: NavApiResponse<QueryInvoiceDataResponse> = await navClient.queryInvoiceData({
  invoiceNumber: "INV-2025-001",
  invoiceDirection: "INBOUND",
  supplierTaxNumber: "12345678",
});

console.log(response.data.invoiceDataResult?.invoiceData);
```

### queryInvoiceCheck

Check whether an invoice exists. Returns a boolean (`invoiceCheckResult`).

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { QueryInvoiceCheckResponse } from 'nav-osa-types';

const response: NavApiResponse<QueryInvoiceCheckResponse> = await navClient.queryInvoiceCheck({
  invoiceNumber: "INV-2025-001",
  invoiceDirection: "OUTBOUND",
  supplierTaxNumber: "12345678",
});

console.log(response.data.invoiceCheckResult);
```

### manageInvoice

Submit invoices to NAV. Accepts an array of `InvoiceOperationType` items directly.

The caller is responsible for:
- setting the `index` (1-100, strictly sequential, no gaps)
- encoding the invoice XML as base64
- specifying the `invoiceOperation` (CREATE / MODIFY / STORNO) per item
- optional `electronicInvoiceHash` per item

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { ManageInvoiceResponse } from 'nav-osa-types';

const response: NavApiResponse<ManageInvoiceResponse> = await navClient.manageInvoice({
  invoiceOperation: [
    {
      index: 1,
      invoiceOperation: "CREATE",
      invoiceData: Buffer.from('<?xml version="1.0"?><InvoiceData>...</InvoiceData>').toString("base64"),
    },
    {
      index: 2,
      invoiceOperation: "MODIFY",
      invoiceData: Buffer.from('<?xml version="1.0"?><InvoiceData>...</InvoiceData>').toString("base64"),
      electronicInvoiceHash: {
        "@_cryptoType": "SHA3-512",
        "#text": "ABC...",
      },
    },
  ],
  compressedContent: false,
  skipXmlValidation: false,
});

console.log(response.data.transactionId);
```

#### Correlation with queryTransactionStatus

When the caller provides the `index`, the corresponding `queryTransactionStatus` response returns the same index in `processingResults[].index` for correlation:

```typescript
const manageResponse = await navClient.manageInvoice({ ... });
const txId = manageResponse.data.transactionId;

const statusResponse = await navClient.queryTransactionStatus({ transactionId: txId });
for (const result of statusResponse.data.processingResults?.processingResult ?? []) {
  console.log(`Index ${result.index}: ${result.invoiceStatus}`);
  // result.index matches the index sent in manageInvoice
}
```

#### Required parameters

| Parameter | Type | Description |
|---|---|---|
| `invoiceOperation` | `InvoiceOperationType[]` | Array of invoice operations. Each item must have `index`, `invoiceOperation`, `invoiceData` (base64). |
| `compressedContent` | `boolean` | Whether the invoice data is compressed. **Required** — no default. |
| `skipXmlValidation` | `boolean` | If `false`, each item's XML is decoded and validated against the XSD schema. If `true`, validation is skipped. **Required** — no default. |
| `exchangeToken` | `string` | Optional. If omitted, a token is obtained automatically via `tokenExchange()`. |

#### Validations

- `index` must be between 1-100, strictly increasing without gaps
- `compressedContent: true` + `skipXmlValidation: false` → error: compressed XML cannot be validated; decompress before submission or set `skipXmlValidation: true`
- `skipXmlValidation: false` → each item's `invoiceData` is base64-decoded and validated against `data.xsd`

### manageAnnulment

Submit technical annulments (storno) for invoices.

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { ManageAnnulmentResponse } from 'nav-osa-types';

const response: NavApiResponse<ManageAnnulmentResponse> = await navClient.manageAnnulment({
  annulmentOperations: [
    {
      index: 1,
      annulmentOperation: "ANNUL",
      invoiceAnnulment: base64EncodedAnnulmentXml,
    },
  ],
});

console.log(response.data.transactionId);
```

### tokenExchange

Request an exchange token for invoice submission. Called automatically by `manageInvoice()` and `manageAnnulment()` if not provided. Returns the decoded token together with its validity window.

```typescript
const { token, tokenValidityFrom, tokenValidityTo } = await navClient.tokenExchange();

import type { NavApiResponse } from 'nav-connect';
import type { ManageInvoiceResponse } from 'nav-osa-types';

const response: NavApiResponse<ManageInvoiceResponse> = await navClient.manageInvoice({
  invoiceOperation: [
    {
      index: 1,
      invoiceOperation: "CREATE",
      invoiceData: Buffer.from(xml).toString("base64"),
    },
  ],
  compressedContent: false,
  skipXmlValidation: false,
  exchangeToken: token,
});
```

### queryTransactionStatus

Query the processing status of a submitted transaction.

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { QueryTransactionStatusResponse } from 'nav-osa-types';

const response: NavApiResponse<QueryTransactionStatusResponse> = await navClient.queryTransactionStatus({
  transactionId: "ABC123...",
  returnOriginalRequest: false,
});

console.log(response.data.processingResults?.processingResult);
```

### queryTransactionList

List all submitted transactions within a date range.

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { QueryTransactionListResponse } from 'nav-osa-types';

const response: NavApiResponse<QueryTransactionListResponse> = await navClient.queryTransactionList({
  page: 1,
  insDate: {
    dateTimeFrom: "2025-01-01T00:00:00Z",
    dateTimeTo: "2025-01-31T23:59:59Z",
  },
  requestStatus: "FINISHED",
});

console.log(response.data.transactionListResult.transaction);
```

### queryTaxpayer

Query taxpayer information by tax number.

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { QueryTaxpayerResponse } from 'nav-osa-types';

const response: NavApiResponse<QueryTaxpayerResponse> = await navClient.queryTaxpayer({
  taxNumber: "12345678",
});

console.log(response.data.taxpayerData?.taxpayerName);
```

### queryInvoiceChainDigest

Query the invoice chain (base invoice, modifications, stornos).

```typescript
import type { NavApiResponse } from 'nav-connect';
import type { QueryInvoiceChainDigestResponse } from 'nav-osa-types';

const response: NavApiResponse<QueryInvoiceChainDigestResponse> = await navClient.queryInvoiceChainDigest({
  page: 1,
  invoiceChainQuery: {
    invoiceNumber: "INV-2025-001",
    invoiceDirection: "OUTBOUND",
    taxNumber: "12345678",
  },
});

console.log(response.data.invoiceChainDigestResult.invoiceChainElement);
```

## Error Handling

All errors extend `NavApiError`. Specific error classes:

- `NavConfigError` — invalid configuration
- `NavDateRangeError` — date range exceeds 35 days
- `NavXmlValidationError` — request XML fails XSD validation (before the HTTP call)
- `NavResponseXmlValidationError` — NAV API response XML fails XSD validation (soft warning path)
- `NavApiResponseError` — NAV API returned an error (structured funcCode/errorCode/message)
- `NavApiHttpError` — HTTP error with unparseable body
- `NavApiTimeoutError` — HTTP request exceeded `httpTimeoutMs` (configurable, default 55 s)

Request validation errors are thrown as `NavXmlValidationError` **before** any network calls.

```typescript
import { NavApiError, NavXmlValidationError, NavResponseXmlValidationError, NavApiResponseError, NavApiHttpError, NavApiTimeoutError } from 'nav-connect';

try {
  const response = await navClient.manageInvoice({
    invoiceOperation: [
      {
        index: 1,
        invoiceOperation: "CREATE",
        invoiceData: Buffer.from(xml).toString("base64"),
      },
    ],
    compressedContent: false,
    skipXmlValidation: false,
  });
  console.log("transactionId:", response.data.transactionId);
} catch (error) {
  if (error instanceof NavXmlValidationError) {
    // 1. Invoice XML validation failed — no network call made
    console.error("Invoice XML errors (index", error.requestType, "):", error.validationErrors);
  } else if (error instanceof NavResponseXmlValidationError) {
    // 2. NAV response XML validation error
    console.error("Response XML error:", error.validationErrors);
  } else if (error instanceof NavApiResponseError) {
    // 3. NAV API rejected the request (e.g. invalid signature, expired token)
    console.error("NAV error:", error.funcCode, error.errorCode, error.message);
  } else if (error instanceof NavApiTimeoutError) {
    // 4. Request timeout (httpTimeoutMs)
    console.error("Timeout:", error.timeoutMs, "ms");
  } else if (error instanceof NavApiHttpError) {
    // 5. HTTP error (e.g. 401, 500)
    console.error("HTTP error:", error.httpStatus, error.statusText);
  } else if (error instanceof NavApiError) {
    // 6. Other NAV errors (e.g. validation, config)
    console.error("NAV error:", error.message);
  } else {
    // 7. Other error (e.g. network error)
    console.error("Unknown error:", error);
  }
}
```

## Support

If you find this package useful, consider supporting the development:

- [Buy me a coffee (GitHub Sponsors)](https://github.com/sponsors/kzolti)
- [Buy me a coffee (Revolut)](https://revolut.me/zoltnifdgo?note=nav-connect)

## License

Apache License 2.0 - see [LICENSE](LICENSE).

## Author

Zoltan Istvan KADA (kAdatSoft)
https://github.com/kzolti/nav-connect
