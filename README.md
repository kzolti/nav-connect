# NAV Connect

Node.js client library for the Hungarian Tax Authority's (NAV) Online Invoice System API v3.0.

## Installation

```bash
npm install nav-connect
```

## Requirements

- Node.js >= 14.0.0
- NAV Online Invoice System credentials (technical user, exchangeKey, signatureKey)

## Usage

`nav-connect` uses `libxml2-wasm` for XSD validation, which requires asynchronous initialization. Use the static `create` method to instantiate the client:

```typescript
import NavConnect from 'nav-connect';

const navClient = await NavConnect.create({
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
  }
});
```

## API

### queryInvoiceDigest

Query invoice digests for a date range (max 35 days). Throws `NavDateRangeError` if the range exceeds 35 days.

```typescript
const response = await navClient.queryInvoiceDigest({
  page: 1,
  invoiceDirectionType: "OUTBOUND",
  insDate: {
    dateTimeFrom: "2025-06-01T00:00:00Z",
    dateTimeTo: "2025-06-30T23:59:59Z",
  },
});
```

### queryInvoiceDigestAll

Query invoice digests for arbitrary date ranges. Automatically splits into 35-day chunks, paginates, and throttles API calls.

```typescript
const digests = await navClient.queryInvoiceDigestAll({
  invoiceDirectionType: "INBOUND",
  insDate: {
    dateTimeFrom: "2025-01-01T00:00:00Z",
    dateTimeTo: "2025-06-01T00:00:00Z",
  },
  throttleMs: 7000, // delay between API calls (default: 5000ms)
  onProgress: (p) => {
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
const response = await navClient.queryInvoiceData({
  invoiceNumber: "INV-2025-001",
  invoiceDirection: "INBOUND",
  supplierTaxNumber: "12345678",
});
```

## Error Handling

All errors extend `NavApiError`. Specific error classes:

- `NavConfigError` - invalid configuration
- `NavDateRangeError` - date range exceeds 35 days
- `NavXmlValidationError` - request XML fails XSD validation
- `NavApiResponseError` - NAV API returned an error (structured funcCode/errorCode/message)
- `NavApiHttpError` - HTTP error with unparseable body

```typescript
import { NavDateRangeError, NavApiResponseError } from 'nav-connect';

try {
  await navClient.queryInvoiceDigest({ /* ... */ });
} catch (error) {
  if (error instanceof NavDateRangeError) {
    // use queryInvoiceDigestAll() instead
  }
  if (error instanceof NavApiResponseError) {
    console.log(error.funcCode, error.errorCode, error.message);
  }
}
```

## License

Apache License 2.0 - see [LICENSE](LICENSE).

## Author

Zoltan Istvan KADA (kAdatSoft)
https://github.com/kzolti/nav-connect
