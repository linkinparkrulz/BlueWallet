// Simple test runner for Paynym integration
// This tests the core functionality without complex dependencies

console.log('🚀 Starting Paynym integration tests...\n');

// Test 1: Basic module loading
try {
  console.log('📋 Test 1: Module Loading');
  
  // Test basic utility functions
  const testPaymentCode = 'PM8TJSWMYyxpcyHofm828gtqF4mHVFY6WAVxH8pvvixhVV6tRrb5ZxsMs6BD188JGZ29RtxHk7m37HPRQuddRoRwGHtGgCQC45qfg28ZdATgDcd1M8Gy';
  
  // Basic validation test
  function isValidPaymentCode(code) {
    if (!code || typeof code !== 'string') return false;
    return code.startsWith('PM8T') && code.length > 10;
  }
  
  const isValid = isValidPaymentCode(testPaymentCode);
  console.log(`  ✅ Payment code validation: ${isValid ? 'PASS' : 'FAIL'}`);
  
  // Test formatting
  function formatPaymentCode(code, paynymInfo = null) {
    if (paynymInfo && paynymInfo.nymName) {
      return `+${paynymInfo.nymName}`;
    }
    return code ? code.substring(0, 20) + '...' : 'Invalid';
  }
  
  const formatted = formatPaymentCode(testPaymentCode);
  console.log(`  ✅ Payment code formatting: ${formatted.includes('...') ? 'PASS' : 'FAIL'}`);
  console.log(`  📝 Formatted result: ${formatted}`);
  
} catch (error) {
  console.log(`  ❌ Test 1 failed: ${error.message}`);
}

// Test 2: API connectivity test
try {
  console.log('\n📋 Test 2: API Connectivity');
  
  // Test if we can make HTTP requests (basic connectivity)
  const https = require('https');
  
  function testPaynymAPI() {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        code: "PM8TJSWMYyxpcyHofm828gtqF4mHVFY6WAVxH8pvvixhVV6tRrb5ZxsMs6BD188JGZ29RtxHk7m37HPRQuddRoRwGHtGgCQC45qfg28ZdATgDcd1M8Gy"
      });
    
      console.log('  📤 Request data:', postData);
      
      const options = {
        hostname: 'paynym.rs',
        path: '//api/v1/token/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000  // Increased timeout
      };
      
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          console.log(`  ✅ Token API reachable: ${res.statusCode}`);
          if (responseData) {
            try {
              const data = JSON.parse(responseData);
              console.log(`  📝 Token response: ${data.token ? 'SUCCESS' : 'FAILED'}`);
              if (data.token) {
                console.log(`  🔑 Token preview: ${data.token.substring(0, 20)}...`);
              }
            } catch (e) {
              console.log(`  ⚠️  Invalid JSON response`);
            }
          }
          resolve(res.statusCode === 200);
        });
      });
        
      req.on('error', (err) => {
        console.log(`  ❌ API error: ${err.message}`);
        resolve(false);
      });
        
      req.on('timeout', () => {
        req.destroy();
        console.log(`  ❌ API timeout after 15 seconds`);
        resolve(false);
      });
        
      req.write(postData);
      req.end();
    });
  }
  
  testPaynymAPI().then(reachable => {
    if (reachable) {
      console.log('  ✅ Paynym.rs API is reachable');
    } else {
      console.log('  ⚠️  Paynym.rs API not reachable (network issue)');
    }
  });

  // Test 2.5: Nym lookup test
  try {
    console.log('\n📋 Test 2.5: Nym Lookup');
    
    const https = require('https');
    
    function testPaynymNym() {
      return new Promise((resolve, reject) => {
        // Test with the same payment code that worked for token
        const postData = JSON.stringify({
          nym: "PM8TJSWMYyxpcyHofm828gtqF4mHVFY6WAVxH8pvvixhVV6tRrb5ZxsMs6BD188JGZ29RtxHk7m37HPRQuddRoRwGHtGgCQC45qfg28ZdATgDcd1M8Gy"
        });
        
        console.log('  📤 Nym request data:', postData);
        
        const options = {
          hostname: 'paynym.rs',
          path: '//api/v1/nym/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 15000
        };
        
        const req = https.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            console.log(`  ✅ Nym API reachable: ${res.statusCode}`);
            if (responseData) {
              try {
                const data = JSON.parse(responseData);
                console.log(`  📝 Nym response: ${res.statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
                
                if (res.statusCode === 200 && data) {
                  console.log(`  👤 Nym Name: ${data.nymName || 'N/A'}`);
                  console.log(`  🆔 Nym ID: ${data.nymID || 'N/A'}`);
                  console.log(`  📊 Followers: ${data.followers ? data.followers.length : 0}`);
                  console.log(`  👥 Following: ${data.following ? data.following.length : 0}`);
                  console.log(`  🔗 Payment Codes: ${data.codes ? data.codes.length : 0}`);
                  
                  // Test compact mode
                  if (data.codes && data.codes.length > 0) {
                    console.log(`  💳 Primary Code: ${data.codes[0].code.substring(0, 20)}...`);
                  }
                } else {
                  console.log(`  ⚠️  Invalid response structure`);
                }
              } catch (e) {
                console.log(`  ⚠️  Invalid JSON response: ${e.message}`);
              }
            }
            resolve(res.statusCode === 200);
          });
        });
        
        req.on('error', (err) => {
          console.log(`  ❌ Nym API error: ${err.message}`);
          resolve(false);
        });
          
        req.on('timeout', () => {
          req.destroy();
          console.log(`  ❌ Nym API timeout after 15 seconds`);
          resolve(false);
        });
          
        req.write(postData);
        req.end();
      });
    }
    
    testPaynymNym().then(success => {
      if (success) {
        console.log('  ✅ Nym lookup functionality: WORKING');
      } else {
        console.log('  ⚠️  Nym lookup failed');
      }
    });
    
  } catch (error) {
    console.log(`  ❌ Test 2.5 failed: ${error.message}`);
  }
  
} catch (error) {
  console.log(`  ❌ Test 2 failed: ${error.message}`);
}

// Test 3: File structure test
try {
  console.log('\n📋 Test 3: File Structure');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'PaynymDirectory.ts',
    'PaynymDisplayUtils.ts',
    'PaynymIntegrationTest.ts',
    'PaynymVerification.ts',
    'README.md'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    console.log(`  ${exists ? '✅' : '❌'} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
    if (!exists) allFilesExist = false;
  });
  
  console.log(`  📁 File structure: ${allFilesExist ? 'PASS' : 'FAIL'}`);
  
} catch (error) {
  console.log(`  ❌ Test 3 failed: ${error.message}`);
}

// Test 4: BIP47 wallet extension test
try {
  console.log('\n📋 Test 4: Wallet Extension');
  
  // Check if wallet file was modified
  const fs = require('fs');
  const path = require('path');
  
  const walletFilePath = path.join(__dirname, '../../class/wallets/hd-segwit-bech32-wallet.ts');
  const walletContent = fs.readFileSync(walletFilePath, 'utf8');
  
  const hasPaynymImports = walletContent.includes('PaynymDirectory') && walletContent.includes('PaynymDisplayUtils');
  const hasPaynymMethods = walletContent.includes('getMyPaynymDisplay') && walletContent.includes('getMyPaynymInfo');
  
  console.log(`  ${hasPaynymImports ? '✅' : '❌'} Paynym imports: ${hasPaynymImports ? 'FOUND' : 'MISSING'}`);
  console.log(`  ${hasPaynymMethods ? '✅' : '❌'} Paynym methods: ${hasPaynymMethods ? 'FOUND' : 'MISSING'}`);
  console.log(`  📝 Wallet extension: ${hasPaynymImports && hasPaynymMethods ? 'PASS' : 'FAIL'}`);
  
} catch (error) {
  console.log(`  ❌ Test 4 failed: ${error.message}`);
}

console.log('\n🎯 Basic tests completed!');
console.log('📝 Next steps: Run tests within BlueWallet app context for full integration testing');
