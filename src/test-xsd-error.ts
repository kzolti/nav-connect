/**
 * Test XSD loading error handling
 * This demonstrates what happens when XSD files are missing
 * Run with: npx ts-node src/test-xsd-error.ts
 */

import NavConnect, { NavApiConfig } from './index';
import * as path from 'path';

console.log('Testing XSD loading error handling...\n');

// Create a valid config
const validConfig: NavApiConfig = {
  testSystem: true,
  taxNumber: '12345678',
  technicalUser: {
    user: 'testuser',
    password: 'testpass',
    signatureKey: 'testsignature',
    exchangeKey: 'testexchange'
  },
  software: {
    softwareId: '123456789012345678',
    softwareName: 'TestSoftware',
    softwareOperation: 'LOCAL_SOFTWARE',
    softwareMainVersion: '1.0.0',
    softwareDevName: 'Test Developer',
    softwareDevContact: 'test@example.com',
    softwareDevCountryCode: 'HU',
    softwareDevTaxNumber: '12345678'
  }
};

console.log('Test: Normal XSD loading (should succeed if XSD files exist)');
try {
  const client = new NavConnect(validConfig);
  console.log('✅ PASSED: XSD files loaded successfully\n');
} catch (error) {
  if (error instanceof Error) {
    console.log('❌ FAILED: XSD loading error:');
    console.log(error.message);
    console.log('\nThis is expected if OSA/xsd directory is missing.');
    console.log('Current working directory:', process.cwd());
    console.log('Expected XSD path:', path.resolve(__dirname, '..', 'OSA', 'xsd'));
  }
}

console.log('\nNote: If XSD files are missing, you should see a detailed error message');
console.log('explaining the expected directory structure and possible causes.');
