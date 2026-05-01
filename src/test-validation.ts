/**
 * Simple validation test for NavConnect configuration
 * Run with: npx ts-node src/test-validation.ts
 */

import NavConnect, { NavApiConfig } from './index';

console.log('Testing NavConnect configuration validation...\n');

// Test 1: Invalid taxNumber (not 8 digits)
console.log('Test 1: Invalid taxNumber (not 8 digits)');
try {
  const config1: NavApiConfig = {
    testSystem: true,
    taxNumber: '1234567', // Only 7 digits
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
  new NavConnect(config1);
  console.log('❌ FAILED: Should have thrown error\n');
} catch (error) {
  if (error instanceof Error) {
    console.log('✅ PASSED: ' + error.message.split('\n')[0] + '\n');
  }
}

// Test 2: Invalid softwareId (not 18 characters)
console.log('Test 2: Invalid softwareId (not 18 characters)');
try {
  const config2: NavApiConfig = {
    testSystem: true,
    taxNumber: '12345678',
    technicalUser: {
      user: 'testuser',
      password: 'testpass',
      signatureKey: 'testsignature',
      exchangeKey: 'testexchange'
    },
    software: {
      softwareId: 'SHORT', // Too short
      softwareName: 'TestSoftware',
      softwareOperation: 'LOCAL_SOFTWARE',
      softwareMainVersion: '1.0.0',
      softwareDevName: 'Test Developer',
      softwareDevContact: 'test@example.com',
      softwareDevCountryCode: 'HU',
      softwareDevTaxNumber: '12345678'
    }
  };
  new NavConnect(config2);
  console.log('❌ FAILED: Should have thrown error\n');
} catch (error) {
  if (error instanceof Error) {
    console.log('✅ PASSED: ' + error.message.split('\n')[0] + '\n');
  }
}

// Test 3: Invalid softwareOperation
console.log('Test 3: Invalid softwareOperation');
try {
  const config3: NavApiConfig = {
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
      softwareOperation: 'INVALID' as any, // Invalid value
      softwareMainVersion: '1.0.0',
      softwareDevName: 'Test Developer',
      softwareDevContact: 'test@example.com',
      softwareDevCountryCode: 'HU',
      softwareDevTaxNumber: '12345678'
    }
  };
  new NavConnect(config3);
  console.log('❌ FAILED: Should have thrown error\n');
} catch (error) {
  if (error instanceof Error) {
    console.log('✅ PASSED: ' + error.message.split('\n')[0] + '\n');
  }
}

// Test 4: Missing required fields
console.log('Test 4: Missing required fields');
try {
  const config4: NavApiConfig = {
    testSystem: true,
    taxNumber: '12345678',
    technicalUser: {
      user: '',
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
  new NavConnect(config4);
  console.log('❌ FAILED: Should have thrown error\n');
} catch (error) {
  if (error instanceof Error) {
    console.log('✅ PASSED: ' + error.message.split('\n')[0] + '\n');
  }
}

// Test 5: Valid configuration
console.log('Test 5: Valid configuration');
try {
  const config5: NavApiConfig = {
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
  new NavConnect(config5);
  console.log('✅ PASSED: Valid configuration accepted\n');
} catch (error) {
  if (error instanceof Error) {
    console.log('❌ FAILED: ' + error.message + '\n');
  }
}

console.log('All validation tests completed!');
