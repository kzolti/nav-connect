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
import { NavConnect } from 'nav-connect';

const navClient = new NavConnect({
  testSystem: true, // set to false for production
  taxNumber: '12345678',
  technicalUser: {
    user: 'yourUserName',
    password: 'yourPassword',
    signatureKey: 'yourSignatureKey',
    exchangeKey: 'yourExchangeKey'
  },
  software: {
    softwareId: 'NAVCONNECT-1.0.0', // Must be exactly 18 characters [0-9A-Z\-]
    softwareName: 'NavConnect',      // Max 50 characters, not empty
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
      invoiceDirection: 'OUTBOUND',
      // other query parameters...
    });
    console.log('Invoices:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Configuration

### TechnicalUser Interface
```typescript
interface TechnicalUser {
  user: string;          // Technical user name
  password: string;      // Technical user password
  signatureKey: string;  // Signature key for XML signing
  exchangeKey: string;   // Exchange key
}
```

### SoftwareType Interface
```typescript
interface SoftwareType {
  softwareId: string;           // Exactly 18 characters [0-9A-Z\-]
  softwareName: string;         // Max 50 characters, not empty
  softwareOperation: string;    // 'LOCAL_SOFTWARE' | 'ONLINE_SERVICE'
  softwareMainVersion: string;  // Max 15 characters, not empty
  softwareDevName: string;      // Max 512 characters, not empty
  softwareDevContact: string;   // Max 200 characters, not empty
  softwareDevCountryCode?: string; // ISO-3166 alpha-2 country code
  softwareDevTaxNumber?: string;   // Max 50 characters
}
```

## Available Endpoints

Currently supported endpoint:
- `queryInvoiceDigest` - Query invoice data with filtering options

## Environment

The `testSystem` configuration parameter determines which environment is used:
- `true`: Test environment
- `false`: Production environment

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Zoltán István KADA

## Version History

### 1.0.0
- Initial release
- Implementation of queryInvoiceDigest endpoint