#!/usr/bin/env node

/**
 * Standalone script to test paynym.rs API outside of BlueWallet
 * 
 * Usage:
 *   node test-paynym-api.js <payment-code>
 * 
 * Example:
 *   node test-paynym-api.js PM8TJNG8dntEAyqAXC1uMyAWAhUMotMCV3RxSNtW7cXiW6ZYsnsoLWky3XXjErPmavJ9AB34ShRVQVKgvehRxa3eRVMqo1JqRhv58D2Vw73EijjrXHws
 * 
 * This script will:
 * 1. Call POST /api/v1/create to register a payment code
 * 2. Show full API response including claimed status
 * 3. Optionally call POST /api/v1/nym to verify claimed status
 * 4. Display all information in a clean, readable format
 */

const API_BASE = 'https://paynym.rs/api/v1';

/**
 * Make POST request to paynym.rs API
 */
async function post(endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  const bodyString = JSON.stringify(body);
  const contentLength = Buffer.byteLength(bodyString, 'utf8');

  console.log(`\n[REQUEST] POST ${url}`);
  console.log(`[REQUEST] Headers: Content-Type: application/json, Content-Length: ${contentLength}`);
  console.log(`[REQUEST] Body: ${bodyString}\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': contentLength.toString(),
      },
      body: bodyString,
    });

    console.log(`[RESPONSE] Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[RESPONSE] Data:`, JSON.stringify(data, null, 2));

    return [data, response.status];
  } catch (error) {
    console.error(`[ERROR] Request failed:`, error.message);
    throw error;
  }
}

/**
 * Create/register a Paynym payment code
 */
async function createPaynym(paymentCode) {
  console.log('='.repeat(80));
  console.log('STEP 1: Create/Register Paynym');
  console.log('='.repeat(80));
  console.log(`Payment Code: ${paymentCode.substring(0, 20)}...`);
  console.log(`Full Length: ${paymentCode.length} characters\n`);

  const [result, statusCode] = await post('/create', { code: paymentCode });

  console.log('\n' + '='.repeat(80));
  console.log('CREATE RESPONSE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Status Code: ${statusCode}`);
  console.log(`Status Meaning: ${statusCode === 201 ? '✅ NEW PAYNYM CREATED' : statusCode === 200 ? '⚠️  PAYNYM ALREADY EXISTS' : '❌ UNEXPECTED STATUS'}`);
  console.log(`\nResponse Data:`);
  console.log(`  - nymID: ${result.nymID || 'N/A'}`);
  console.log(`  - nymName: ${result.nymName || 'N/A'}`);
  console.log(`  - claimed: ${result.claimed ? '✅ YES (CLAIMED)' : '❌ NO (UNCLAIMED)'}`);
  console.log(`  - segwit: ${result.segwit ? '✅ YES' : '❌ NO'}`);
  console.log(`  - token: ${result.token ? result.token.substring(0, 20) + '...' : 'N/A'}`);

  return [result, statusCode];
}

/**
 * Get Paynym info to verify claimed status
 */
async function getNymInfo(nymIdentifier) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: Verify with /nym endpoint');
  console.log('='.repeat(80));
  console.log(`Nym Identifier: ${nymIdentifier}\n`);

  const [result, statusCode] = await post('/nym', { nym: nymIdentifier });

  console.log('\n' + '='.repeat(80));
  console.log('/nym RESPONSE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Status Code: ${statusCode}`);
  console.log(`\nAccount Info:`);
  console.log(`  - nymID: ${result.nymID || 'N/A'}`);
  console.log(`  - nymName: ${result.nymName || 'N/A'}`);
  console.log(`\nLinked Codes (${result.codes?.length || 0} total):`);
  
  if (result.codes && result.codes.length > 0) {
    result.codes.forEach((codeInfo, index) => {
      console.log(`  [${index + 1}] ${codeInfo.code.substring(0, 20)}...`);
      console.log(`      - claimed: ${codeInfo.claimed ? '✅ YES' : '❌ NO'}`);
      console.log(`      - segwit: ${codeInfo.segwit ? '✅ YES' : '❌ NO'}`);
    });
  } else {
    console.log(`  No linked codes found`);
  }

  console.log(`\nSocial Info:`);
  console.log(`  - Followers: ${result.followers?.length || 0}`);
  console.log(`  - Following: ${result.following?.length || 0}`);

  return [result, statusCode];
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: Payment code required');
    console.error('Usage: node test-paynym-api.js <payment-code>');
    console.error('\nExample:');
    console.error('  node test-paynym-api.js PM8TJNG8dntEAyqAXC1uMyAWAhUMotMCV3RxSNtW7cXiW6ZYsnsoLWky3XXjErPmavJ9AB34ShRVQVKgvehRxa3eRVMqo1JqRhv58D2Vw73EijjrXHws');
    process.exit(1);
  }

  const paymentCode = args[0];

  // Validate payment code format
  if (!paymentCode.startsWith('PM8T')) {
    console.error('Error: Invalid payment code format');
    console.error('Payment codes must start with "PM8T"');
    process.exit(1);
  }

  if (paymentCode.length < 50) {
    console.error('Error: Payment code too short');
    console.error('Expected at least 50 characters, got:', paymentCode.length);
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('PAYNYM API TEST SCRIPT');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Payment Code: ${paymentCode}`);

  try {
    // Step 1: Create/Register
    const [createResult, createStatusCode] = await createPaynym(paymentCode);

    // Step 2: Verify with /nym endpoint
    const nymIdentifier = createResult.nymID || paymentCode;
    const [nymResult, nymStatusCode] = await getNymInfo(nymIdentifier);

    // Final analysis
    console.log('\n' + '='.repeat(80));
    console.log('FINAL ANALYSIS');
    console.log('='.repeat(80));
    
    const fromCreate = createResult.claimed;
    const fromNym = nymResult.codes?.[0]?.claimed;

    console.log(`Claimed status from /create: ${fromCreate ? '✅ YES' : '❌ NO'}`);
    console.log(`Claimed status from /nym:   ${fromNym ? '✅ YES' : '❌ NO'}`);

    if (fromCreate !== fromNym) {
      console.log('\n⚠️  WARNING: CLAIMED STATUS MISMATCH!');
      console.log('The /create and /nym endpoints are returning different claimed statuses.');
      console.log('This may indicate an API bug.');
    } else if (fromCreate) {
      console.log('\n✅ Both endpoints agree: Paynym is CLAIMED');
      console.log('If this is a brand new payment code, this is unexpected.');
    } else {
      console.log('\n✅ Both endpoints agree: Paynym is UNCLAIMED');
      console.log('This is the expected state for a new payment code.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('TEST FAILED');
    console.error('='.repeat(80));
    console.error(error.message);
    process.exit(1);
  }
}

// Run the script
main();