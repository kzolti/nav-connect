# NAV Connect

A Node.js client library for the Hungarian Tax Authority's (NAV) Online Invoice System.

## Installation

```bash
npm install nav-connect
```

## Requirements

- Node.js >= 14.0.0
- Valid NAV Online Invoice System credentials (technical user, exchangeKey, signatureKey)

## Basic Usage

```typescript
import NavConnect from 'nav-connect';

const navClient = new NavConnect({
  testSystem: true, // set to false for production
  taxNumber: '12345678',  // technical user taxpayerid, The 8-digit core number section of the tax number
  technicalUser: {
    user: 'yourUserName',
    password: 'yourPassword',
    signatureKey: 'yourSignatureKey',
    exchangeKey: 'yourExchangeKey'
  },
  software: {
    softwareId: 'YOUR-SOFTWARE-ID', // Must be exactly 18 characters [0-9A-Z\-]
    softwareName: 'YourSoftwareName',      // Max 50 characters, not empty
    softwareOperation: 'LOCAL_SOFTWARE', // Must be either 'LOCAL_SOFTWARE' or 'ONLINE_SERVICE'
    softwareMainVersion: '1.0.0',    // Max 15 characters, not empty
    softwareDevName: 'Your Name',    // Max 512 characters, not empty
    softwareDevContact: 'your@email.com', // Max 200 characters, not empty
    softwareDevCountryCode: 'HU',    // ISO-3166 alpha-2 country code
    softwareDevTaxNumber: 'your-tax-number' // Max 50 characters
  }
});

// Example: Query invoice digest
async function queryInvoices() {
  try {
    const response = await navClient.queryInvoiceDigest({
      page: 1,
      invoiceDirectionType: "OUTBOUND",
      insDate: {
        dateTimeFrom: "2025-06-01T00:00:00Z",
        dateTimeTo: "2025-06-30T23:59:59Z",
      },
    });
    console.log('Invoices:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Available Endpoints

Currently supported endpoint:
- `queryInvoiceDigest` - Query invoice data with filtering options

## License

Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

### Attribution Requirements
When using this software, you must give appropriate credit to:
- Author: Zoltán István KADA
- Company: kAdatSoft
- Repository: https://github.com/kzolti/nav-connect

## Author

Zoltán István KADA (kAdatSoft)
