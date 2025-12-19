// Simple test runner for Paynym integration
// Usage: node blue_modules/paynym/test-runner.js

// Since we're running tests directly with Node.js, let's create a simple test harness
const PaynymDisplayUtils = require('./PaynymDisplayUtils.ts').default;

async function runTests() {
  try {
    console.log('🚀 Starting Paynym integration tests with real payment code...\n');
    
    const results = await PaynymIntegrationTest.runAllTests();
    
    console.log('\n📊 Test Results:');
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${test}`);
    });
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log(`\n🎯 Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Paynym integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the implementation.');
    }
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
