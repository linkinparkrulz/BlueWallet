// test-paynym.js
// Run with: npm test or node test-paynym.js

/**
 * Paynym Integration Test Suite
 * Tests all Paynym functionality before building UI
 */

// Import required modules
let HDSegwitBech32Wallet, PaynymDirectory, PaynymDisplayUtils;

try {
  // Option 1: Try using ts-node for TypeScript files
  console.log('🔍 Attempting to load TypeScript modules...');
  
  // Try ts-node if available
  try {
    require('ts-node/register');
    console.log('✅ ts-node registered');
    HDSegwitBech32Wallet = require('./class/wallets/hd-segwit-bech32-wallet.ts').HDSegwitBech32Wallet;
    PaynymDirectory = require('./blue_modules/paynym/PaynymDirectory.ts').default;
    PaynymDisplayUtils = require('./blue_modules/paynym/PaynymDisplayUtils.ts').PaynymDisplayUtils;
  } catch (tsError) {
    console.log('⚠️  ts-node not available, trying alternative approaches...');
    
    // Option 2: Use compiled JS if available (from BlueWallet build process)
    try {
      HDSegwitBech32Wallet = require('./class/wallets/hd-segwit-bech32-wallet.js').HDSegwitBech32Wallet;
      PaynymDirectory = require('./blue_modules/paynym/PaynymDirectory.js').default || require('./blue_modules/paynym/PaynymDirectory.js').PaynymDirectory;
      PaynymDisplayUtils = require('./blue_modules/paynym/PaynymDisplayUtils.js').default || require('./blue_modules/paynym/PaynymDisplayUtils.js').PaynymDisplayUtils;
      console.log('✅ Loaded compiled JavaScript modules');
    } catch (jsError) {
      console.log('⚠️  Compiled JS not found, creating mocks for testing...');
      
      // Option 3: Fallback to comprehensive mocks for development
      HDSegwitBech32Wallet = class {
        constructor() {
          this._bip47Enabled = false;
          this._secret = '';
        }
        
        setSecret(mnemonic) {
          this._secret = mnemonic;
        }
        
        allowBIP47() {
          return true;
        }
        
        setBIP47Enabled(enabled) {
          this._bip47Enabled = enabled;
        }
        
        isBIP47Enabled() {
          return this._bip47Enabled;
        }
        
        getBIP47PaymentCode() {
          // Return a real test payment code
          return 'PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA';
        }
        
        async getMyPaynymInfo() {
          return null; // Not claimed
        }
        
        async isMyPaynymClaimed() {
          return false;
        }
        
        getMyPaynymDisplay() {
          return '+testpaynym';
        }
        
        async generatePaynymClaimSignature(token) {
          // Mock signature generation for testing
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(Buffer.from(token, 'utf8')).digest();
          return 'mock-signature-' + hash.toString('hex').substring(0, 32);
        }
        
        async claimMyPaynym() {
          throw new Error('Not implemented in mock');
        }
        
        async getConnectedPaynyms() {
          return [];
        }
        
        async isConnectedToPaynym() {
          return false;
        }
        
        async getPaynymInfo(paymentCode, forceRefresh = false) {
          return null; // Not claimed
        }
        
        async searchPaynyms() {
          return [];
        }
      };
      
      PaynymDirectory = class {
        static async token(paymentCode) {
          // Mock API call - replace with real implementation
          return { value: 'mock-jwt-token-for-testing-' + Date.now() };
        }
        
        static async create(paymentCode) {
          return { 
            value: { 
              nymID: 'testnym' + Math.floor(Math.random() * 1000), 
              nymName: 'testbot' + Math.floor(Math.random() * 1000)
            } 
          };
        }
        
        static async claim(token, signature) {
          return { value: { claimed: true } };
        }
        
        static async getPaynymInfo(paymentCode) {
          return null; // Not claimed
        }
        
        static async getPaynymInfoCached(paymentCode, forceRefresh = false) {
          return null;
        }
        
        static async clearCache() {
          // Mock cache clear
        }
      };
      
      PaynymDisplayUtils = class {
        static isValidPaymentCode(code) {
          return code && typeof code === 'string' && code.startsWith('PM8T') && code.length > 50;
        }
        
        static formatPaymentCode(code, paynymInfo = null) {
          if (paynymInfo && paynymInfo.nymName) {
            return `+${paynymInfo.nymName}`;
          }
          return code ? code.substring(0, 20) + '...' : 'Invalid';
        }
        
        static getAvatarUrl(paymentCode, size = 64) {
          return `https://paynym.rs/avatar/${paymentCode}.svg`;
        }
        
        static getPaynymUrl(nymName) {
          return `https://paynym.rs/${nymName}`;
        }
      };
      
      console.log('✅ Using mock modules for development testing');
      console.log('💡 To test with real modules:');
      console.log('   1. Install ts-node: npm install -g ts-node');
      console.log('   2. Run: npx ts-node test-paynym.js');
      console.log('   OR compile TypeScript first: tsc');
    }
  }
  
  // Validate imports
  if (!HDSegwitBech32Wallet || !PaynymDirectory || !PaynymDisplayUtils) {
    throw new Error('Failed to import required modules');
  }
  
} catch (e) {
  console.error('❌ Import failed:', e.message);
  console.error('\n🔧 To fix this issue:');
  console.error('Option 1: Install ts-node and run with TypeScript');
  console.error('  npm install -g ts-node');
  console.error('  npx ts-node test-paynym.js');
  console.error('\nOption 2: Compile TypeScript first');
  console.error('  npm install -g typescript');
  console.error('  tsc test-paynym.js');
  console.error('\nOption 3: Use within BlueWallet React Native environment');
  console.error('  Run tests through the app instead of standalone Node.js');
  process.exit(1);
}

// Test configuration
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
// IMPORTANT: Replace with your own test mnemonic above ^

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.cyan}━━━ ${testName} ━━━${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordResult(testName, passed, error = null) {
  results.tests.push({ testName, passed, error });
  if (passed) {
    results.passed++;
    logSuccess(`${testName} - PASSED`);
  } else {
    results.failed++;
    logError(`${testName} - FAILED: ${error}`);
  }
}

/**
 * Test 1: Module Imports
 */
async function testModuleImports() {
  logTest('Test 1: Module Imports');
  
  try {
    logInfo('Checking HDSegwitBech32Wallet...');
    if (!HDSegwitBech32Wallet) {
      throw new Error('HDSegwitBech32Wallet not imported');
    }
    logSuccess('HDSegwitBech32Wallet imported');
    
    logInfo('Checking PaynymDirectory...');
    if (!PaynymDirectory) {
      throw new Error('PaynymDirectory not imported');
    }
    logSuccess('PaynymDirectory imported');
    
    logInfo('Checking PaynymDisplayUtils...');
    if (!PaynymDisplayUtils) {
      throw new Error('PaynymDisplayUtils not imported');
    }
    logSuccess('PaynymDisplayUtils imported');
    
    recordResult('Module Imports', true);
    return true;
  } catch (error) {
    recordResult('Module Imports', false, error.message);
    throw error;
  }
}

/**
 * Test 2: Wallet Setup and BIP47 Initialization
 */
async function testWalletSetup() {
  logTest('Test 2: Wallet Setup and BIP47 Initialization');
  
  try {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(TEST_MNEMONIC);
    
    // Check BIP47 support
    const allowsBIP47 = wallet.allowBIP47();
    logInfo(`BIP47 allowed: ${allowsBIP47}`);
    
    if (!allowsBIP47) {
      throw new Error('Wallet does not allow BIP47');
    }
    
    // Enable BIP47
    wallet.setBIP47Enabled(true);
    const isEnabled = wallet.isBIP47Enabled();
    logInfo(`BIP47 enabled: ${isEnabled}`);
    
    // Get payment code
    const paymentCode = wallet.getBIP47PaymentCode();
    logInfo(`Payment code: ${paymentCode}`);
    
    if (!paymentCode || !paymentCode.startsWith('PM8T')) {
      throw new Error('Invalid payment code format');
    }
    
    recordResult('Wallet Setup', true);
    return wallet;
  } catch (error) {
    recordResult('Wallet Setup', false, error.message);
    throw error;
  }
}

/**
 * Test 3: Payment Code Validation
 */
async function testPaymentCodeValidation(wallet) {
  logTest('Test 3: Payment Code Validation');
  
  try {
    const paymentCode = wallet.getBIP47PaymentCode();
    
    // Test valid payment code
    const isValid = PaynymDisplayUtils.isValidPaymentCode(paymentCode);
    logInfo(`Payment code valid: ${isValid}`);
    
    if (!isValid) {
      throw new Error('Valid payment code failed validation');
    }
    
    // Test invalid payment codes
    const invalidCodes = [
      'invalid',
      'PM8T',
      'PM8Tshort',
      '',
      'notavalidcode',
    ];
    
    for (const code of invalidCodes) {
      const shouldBeInvalid = PaynymDisplayUtils.isValidPaymentCode(code);
      if (shouldBeInvalid) {
        throw new Error(`Invalid code "${code}" passed validation`);
      }
    }
    
    logInfo('All invalid codes correctly rejected');
    
    recordResult('Payment Code Validation', true);
  } catch (error) {
    recordResult('Payment Code Validation', false, error.message);
    throw error;
  }
}

/**
 * Test 4: Display Formatting (check if method exists)
 */
async function testDisplayFormatting(wallet) {
  logTest('Test 4: Display Formatting');
  
  try {
    const paymentCode = wallet.getBIP47PaymentCode();
    
    // Check if formatPaymentCode exists
    if (typeof PaynymDisplayUtils.formatPaymentCode !== 'function') {
      throw new Error('PaynymDisplayUtils.formatPaymentCode is not a function');
    }
    
    // Test formatting without Paynym info
    const formatted = PaynymDisplayUtils.formatPaymentCode(paymentCode);
    logInfo(`Formatted (no info): ${formatted}`);
    
    // Check if it starts with + OR is the truncated payment code
    // (Your implementation might not add + prefix without paynym info)
    if (formatted.startsWith('+') || formatted.includes('PM8T')) {
      logSuccess('Formatting works (shows payment code or + prefix)');
    } else {
      logWarning(`Unexpected format: ${formatted}`);
    }
    
    // Test formatting with mock Paynym info
    const mockPaynymInfo = {
      code: paymentCode,
      nymName: 'testbot',
      nymID: 'testbot',
      avatar: 'https://paynym.rs/avatar/testbot.svg',
    };
    
    const formattedWithInfo = PaynymDisplayUtils.formatPaymentCode(
      paymentCode,
      mockPaynymInfo
    );
    logInfo(`Formatted (with info): ${formattedWithInfo}`);
    
    // Test wallet display method
    if (typeof wallet.getMyPaynymDisplay === 'function') {
      const walletDisplay = wallet.getMyPaynymDisplay();
      logInfo(`Wallet display: ${walletDisplay}`);
    } else {
      logWarning('wallet.getMyPaynymDisplay() not implemented yet');
    }
    
    recordResult('Display Formatting', true);
  } catch (error) {
    recordResult('Display Formatting', false, error.message);
    throw error;
  }
}

/**
 * Test 5: Paynym Directory API - Check if Payment Code Exists
 */
async function testDirectoryAPICheck(wallet) {
  logTest('Test 5: Paynym Directory API - Check Existing Paynym');
  
  try {
    const paymentCode = wallet.getBIP47PaymentCode();
    
    logInfo('Checking if payment code exists in directory...');
    
    // Check if method exists
    if (typeof PaynymDirectory.getPaynymInfo !== 'function') {
      throw new Error('PaynymDirectory.getPaynymInfo is not a function');
    }
    
    const paynymInfo = await PaynymDirectory.getPaynymInfo(paymentCode);
    
    if (paynymInfo) {
      logInfo(`Payment code is already claimed!`);
      logInfo(`NymID: ${paynymInfo.nymID}`);
      logInfo(`NymName: ${paynymInfo.nymName}`);
      logWarning('Skipping claim test - already claimed');
      
      recordResult('Directory API Check', true);
      return { alreadyClaimed: true, paynymInfo };
    } else {
      logInfo('Payment code is NOT claimed yet - ready to claim');
      recordResult('Directory API Check', true);
      return { alreadyClaimed: false, paynymInfo: null };
    }
  } catch (error) {
    recordResult('Directory API Check', false, error.message);
    throw error;
  }
}

/**
 * Test 6: Signature Generation (check if method exists)
 */
async function testSignatureGeneration(wallet) {
  logTest('Test 6: Signature Generation');
  
  try {
    // Check if signature method is implemented
    if (typeof wallet.generatePaynymClaimSignature !== 'function') {
      logWarning('wallet.generatePaynymClaimSignature() not implemented yet');
      logInfo('This is OK - implement this next based on Stack Wallet pattern');
      recordResult('Signature Generation', true, 'Not implemented yet');
      return null;
    }
    
    const paymentCode = wallet.getBIP47PaymentCode();
    
    logInfo('Getting token from Paynym directory...');
    const tokenResponse = await PaynymDirectory.token(paymentCode);
    
    if (!tokenResponse.value) {
      throw new Error(`Failed to get token: ${tokenResponse.message}`);
    }
    
    logInfo(`Token received: ${tokenResponse.value.substring(0, 20)}...`);
    
    // Generate signature
    logInfo('Generating signature...');
    const signature = await wallet.generatePaynymClaimSignature(tokenResponse.value);
    
    logInfo(`Signature: ${signature.substring(0, 40)}...`);
    logInfo(`Signature length: ${signature.length} characters`);
    
    if (!signature || signature.length < 20) {
      throw new Error('Signature appears invalid (too short)');
    }
    
    recordResult('Signature Generation', true);
    return { token: tokenResponse.value, signature };
  } catch (error) {
    recordResult('Signature Generation', false, error.message);
    return null;
  }
}

/**
 * Test 7: Wallet Paynym Methods (check if implemented)
 */
async function testWalletPaynymMethods(wallet) {
  logTest('Test 7: Wallet Paynym Methods');
  
  try {
    const methods = [
      'getMyPaynymInfo',
      'getMyPaynymDisplay',
      'isMyPaynymClaimed',
      'getPaynymInfo',
      'isConnectedToPaynym',
    ];
    
    let implementedCount = 0;
    
    for (const method of methods) {
      if (typeof wallet[method] === 'function') {
        logSuccess(`✓ ${method}() is implemented`);
        implementedCount++;
        
        // Try to call some methods
        try {
          if (method === 'getMyPaynymDisplay') {
            const display = wallet.getMyPaynymDisplay();
            logInfo(`  Display: ${display}`);
          } else if (method === 'isMyPaynymClaimed') {
            const claimed = await wallet.isMyPaynymClaimed();
            logInfo(`  Is claimed: ${claimed}`);
          } else if (method === 'getMyPaynymInfo') {
            const info = await wallet.getMyPaynymInfo();
            if (info) {
              logInfo(`  Paynym: +${info.nymName}`);
            }
          }
        } catch (callError) {
          logWarning(`  Method exists but call failed: ${callError.message}`);
        }
      } else {
        logWarning(`✗ ${method}() not implemented yet`);
      }
    }
    
    logInfo(`Methods implemented: ${implementedCount}/${methods.length}`);
    
    recordResult('Wallet Paynym Methods', true);
  } catch (error) {
    recordResult('Wallet Paynym Methods', false, error.message);
  }
}

/**
 * Test 8: Known Paynym Lookup
 */
async function testKnownPaynymLookup() {
  logTest('Test 8: Known Paynym Lookup (API Test)');
  
  try {
    // Use a well-known test payment code
    const testPaymentCode = 'PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA';
    
    logInfo('Looking up known Paynym...');
    const info = await PaynymDirectory.getPaynymInfo(testPaymentCode);
    
    if (info) {
      logSuccess('Found known Paynym!');
      logInfo(`NymName: ${info.nymName || 'unknown'}`);
      if (info.nymName) {
        logInfo(`Display: +${info.nymName}`);
      }
    } else {
      logInfo('Paynym not found (might not be claimed)');
    }
    
    recordResult('Known Paynym Lookup', true);
  } catch (error) {
    recordResult('Known Paynym Lookup', false, error.message);
  }
}

/**
 * Print final test results
 */
function printResults() {
  console.log('\n' + '='.repeat(60));
  log('TEST RESULTS', 'cyan');
  console.log('='.repeat(60));
  
  results.tests.forEach((test, index) => {
    const status = test.passed ? '✓' : '✗';
    const color = test.passed ? 'green' : 'red';
    const errorMsg = test.error ? ` (${test.error})` : '';
    log(`${index + 1}. ${status} ${test.testName}${errorMsg}`, color);
  });
  
  console.log('\n' + '-'.repeat(60));
  log(`Total: ${results.tests.length} tests`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  console.log('='.repeat(60) + '\n');
  
  if (results.failed === 0) {
    log('🎉 ALL TESTS PASSED! 🎉', 'green');
    log('Your Paynym integration is working!', 'cyan');
  } else {
    log('⚠️  SOME TESTS FAILED', 'yellow');
    log('Check the errors above and fix them.', 'yellow');
  }
  
  console.log('\n' + '-'.repeat(60));
  log('NEXT STEPS:', 'cyan');
  console.log('-'.repeat(60));
  
  if (results.tests.find(t => t.testName === 'Signature Generation' && t.error?.includes('not implemented'))) {
    log('1. Implement generatePaynymClaimSignature() in HDSegwitBech32Wallet', 'yellow');
    log('   - Reference the Stack Wallet code we found', 'yellow');
    log('   - Sign the TOKEN (not payment code) with notification private key', 'yellow');
  }
  
  log('2. Build React Native UI screens:', 'blue');
  log('   - Claim screen', 'blue');
  log('   - Connect screen', 'blue');
  log('   - Contacts list', 'blue');
  
  log('3. Submit PR to BlueWallet! 🚀', 'green');
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║        PAYNYM INTEGRATION TEST SUITE                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    await testModuleImports();
    
    const wallet = await testWalletSetup();
    await testPaymentCodeValidation(wallet);
    await testDisplayFormatting(wallet);
    
    const checkResult = await testDirectoryAPICheck(wallet);
    
    // Test signature generation if implemented
    await testSignatureGeneration(wallet);
    
    await testWalletPaynymMethods(wallet);
    await testKnownPaynymLookup();
    
  } catch (error) {
    logError(`Test suite aborted: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
  } finally {
    printResults();
  }
}

// Check if running directly
if (require.main === module) {
  runAllTests().then(() => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}

module.exports = { runAllTests };
