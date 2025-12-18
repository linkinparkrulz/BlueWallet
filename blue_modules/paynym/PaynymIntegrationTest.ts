// Type declarations for global objects
declare const console: {
  log: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
};

import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import PaynymDirectory from './PaynymDirectory';
import PaynymDisplayUtils from './PaynymDisplayUtils';
import { PaynymInfo } from './PaynymDirectory';

/**
 * Test suite for Paynym integration
 * This verifies the corrected Paynym implementation works with existing BIP47 infrastructure
 */
export class PaynymIntegrationTest {
  /**
   * Test basic Paynym directory functionality
   */
  static async testDirectoryAPI(): Promise<boolean> {
    try {
      console.log('Testing Paynym directory API...');
      
      // Test with known payment code (user-provided)
      const testPaymentCode = 'PM8TJSWMYyxpcyHofm828gtqF4mHVFY6WAVxH8pvvixhVV6tRrb5ZxsMs6BD188JGZ29RtxHk7m37HPRQuddRoRwGHtGgCQC45qfg28ZdATgDcd1M8Gy';
      
      const paynymInfo = await PaynymDirectory.getPaynymInfo(testPaymentCode);
      console.log('Fetched Paynym info:', paynymInfo);
      
      return paynymInfo !== null;
    } catch (error) {
      console.error('Directory API test failed:', error);
      return false;
    }
  }

  /**
   * Test Paynym display utilities
   */
  static testDisplayUtils(): boolean {
    try {
      console.log('Testing Paynym display utilities...');
      
      const testPaymentCode = 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
      const testPaynymInfo: PaynymInfo = {
        code: testPaymentCode,
        nymID: 'testbot',
        nymName: 'testbot',
        avatar: 'https://paynym.rs/avatar/testbot.svg',
        followers: 10,
        following: 5,
      };
      
      // Test formatting
      const formatted = PaynymDisplayUtils.formatPaymentCode(testPaymentCode, testPaynymInfo);
      console.log('Formatted Paynym:', formatted);
      
      // Test validation
      const isValid = PaynymDisplayUtils.isValidPaymentCode(testPaymentCode);
      console.log('Payment code valid:', isValid);
      
      // Test avatar URL
      const avatarUrl = PaynymDisplayUtils.getAvatarUrl(testPaynymInfo);
      console.log('Avatar URL:', avatarUrl);
      
      return !!formatted && !!isValid && !!avatarUrl;
    } catch (error) {
      console.error('Display utils test failed:', error);
      return false;
    }
  }

  /**
   * Test wallet integration with mock wallet
   */
  static testWalletIntegration(): boolean {
    try {
      console.log('Testing wallet integration...');
      
      // Create a mock wallet instance for testing
      const wallet = {} as HDSegwitBech32Wallet;
      
      // Mock the BIP47 methods
      wallet.allowBIP47 = () => true;
      wallet.isBIP47Enabled = () => true;
      wallet.getBIP47PaymentCode = () => 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
      wallet.getBIP47SenderPaymentCodes = () => ['PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j'];
      wallet.getBIP47ReceiverPaymentCodes = () => ['PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j'];
      
      // Test display method
      const display = wallet.getMyPaynymDisplay();
      console.log('Wallet Paynym display:', display);
      
      return display.length > 0;
    } catch (error) {
      console.error('Wallet integration test failed:', error);
      return false;
    }
  }

  /**
   * Test payment code validation
   */
  static testPaymentCodeValidation(): boolean {
    try {
      console.log('Testing payment code validation...');
      
      const validCodes = [
        'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j',
        'PM8T123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
      ];
      
      const invalidCodes = [
        'invalid',
        'PM8T',
        'PM8Tinvalidchars',
        '',
      ];
      
      let allValidPassed = true;
      for (const code of validCodes) {
        const isValid = PaynymDisplayUtils.isValidPaymentCode(code);
        console.log(`Valid code ${code.substring(0, 10)}...: ${isValid}`);
        if (!isValid) allValidPassed = false;
      }
      
      let allInvalidPassed = true;
      for (const code of invalidCodes) {
        const isValid = PaynymDisplayUtils.isValidPaymentCode(code);
        console.log(`Invalid code "${code}": ${isValid}`);
        if (isValid) allInvalidPassed = false;
      }
      
      return allValidPassed && allInvalidPassed;
    } catch (error) {
      console.error('Payment code validation test failed:', error);
      return false;
    }
  }

  /**
   * Test caching functionality
   */
  static async testCaching(): Promise<boolean> {
    try {
      console.log('Testing caching functionality...');
      
      const testPaymentCode = 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
      
      // Clear cache first
      await PaynymDirectory.clearCache();
      
      // First call should fetch from API
      const firstCall = await PaynymDirectory.getPaynymInfoCached(testPaymentCode);
      console.log('First call result:', firstCall ? 'Success' : 'Failed');
      
      // Second call should use cache
      const secondCall = await PaynymDirectory.getPaynymInfoCached(testPaymentCode);
      console.log('Second call result:', secondCall ? 'Success' : 'Failed');
      
      return firstCall !== null && secondCall !== null;
    } catch (error) {
      console.error('Caching test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<{ [key: string]: boolean }> {
    console.log('Starting Paynym integration tests...');
    
    const results = {
      directoryAPI: await this.testDirectoryAPI(),
      displayUtils: this.testDisplayUtils(),
      walletIntegration: this.testWalletIntegration(),
      paymentCodeValidation: this.testPaymentCodeValidation(),
      caching: await this.testCaching(),
    };
    
    console.log('Test results:', results);
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log(`Tests passed: ${passed}/${total}`);
    
    return results;
  }
}

export default PaynymIntegrationTest;
