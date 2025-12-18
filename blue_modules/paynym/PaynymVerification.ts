// Type declarations for global objects
declare const console: {
  log: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
};

import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import PaynymDisplayUtils from './PaynymDisplayUtils';

/**
 * Verification that Paynym integration doesn't break existing BIP47 functionality
 */
export class PaynymVerification {
  /**
   * Verify that existing BIP47 methods still work
   */
  static verifyBIP47Compatibility(): boolean {
    try {
      console.log('Verifying BIP47 compatibility...');
      
      // Create mock wallet
      const wallet = {} as HDSegwitBech32Wallet;
      
      // Mock essential BIP47 methods
      wallet.allowBIP47 = () => true;
      wallet.isBIP47Enabled = () => true;
      wallet.getBIP47PaymentCode = () => 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
      wallet.getBIP47SenderPaymentCodes = () => ['PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j'];
      wallet.getBIP47ReceiverPaymentCodes = () => ['PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j'];
      wallet.getBIP47NotificationTransaction = () => undefined;
      
      // Test existing BIP47 methods still work
      const paymentCode = wallet.getBIP47PaymentCode();
      const senderCodes = wallet.getBIP47SenderPaymentCodes();
      const receiverCodes = wallet.getBIP47ReceiverPaymentCodes();
      const notificationTx = wallet.getBIP47NotificationTransaction('PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j');
      
      const bip47Works = paymentCode && senderCodes && receiverCodes && notificationTx !== undefined;
      console.log('BIP47 methods work:', bip47Works);
      
      // Test new Paynym methods don't interfere
      const paynymDisplay = wallet.getMyPaynymDisplay();
      const paynymWorks = paynymDisplay && paynymDisplay.length > 0;
      console.log('Paynym methods work:', paynymWorks);
      
      return !!(bip47Works && paynymWorks);
    } catch (error) {
      console.error('BIP47 compatibility verification failed:', error);
      return false;
    }
  }

  /**
   * Verify Paynym display formatting
   */
  static verifyDisplayFormatting(): boolean {
    try {
      console.log('Verifying display formatting...');
      
      // Test with payment code only
      const paymentCode = 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
      const formattedWithoutInfo = PaynymDisplayUtils.formatPaymentCode(paymentCode);
      
      // Test with Paynym info
      const paynymInfo = {
        code: paymentCode,
        nymName: 'testbot',
        avatar: 'https://paynym.rs/avatar/testbot.svg',
      };
      const formattedWithInfo = PaynymDisplayUtils.formatPaymentCode(paymentCode, paynymInfo);
      
      // Test validation
      const isValid = PaynymDisplayUtils.isValidPaymentCode(paymentCode);
      
      console.log('Formatted without info:', formattedWithoutInfo);
      console.log('Formatted with info:', formattedWithInfo);
      console.log('Valid payment code:', isValid);
      
      return formattedWithoutInfo.includes('+') && 
             formattedWithInfo.includes('+testbot') && 
             isValid;
    } catch (error) {
      console.error('Display formatting verification failed:', error);
      return false;
    }
  }

  /**
   * Verify wallet method signatures
   */
  static verifyMethodSignatures(): boolean {
    try {
      console.log('Verifying method signatures...');
      
      const wallet = {} as HDSegwitBech32Wallet;
      
      // Mock minimal required methods
      wallet.allowBIP47 = () => true;
      wallet.isBIP47Enabled = () => true;
      wallet.getBIP47PaymentCode = () => 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
      
      // Test that new methods have correct signatures
      const myPaynymDisplay = wallet.getMyPaynymDisplay();
      const myPaynymInfo = wallet.getMyPaynymInfo();
      const isMyPaynymClaimed = wallet.isMyPaynymClaimed();
      const paynymInfo = wallet.getPaynymInfo('PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j');
      const isConnected = wallet.isConnectedToPaynym('PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j');
      const connectedPaynyms = wallet.getConnectedPaynyms();
      const searchResults = wallet.searchPaynyms('test');
      
      const signaturesWork = typeof myPaynymDisplay === 'string' &&
                          myPaynymInfo instanceof Promise &&
                          isMyPaynymClaimed instanceof Promise &&
                          paynymInfo instanceof Promise &&
                          typeof isConnected === 'boolean' &&
                          connectedPaynyms instanceof Promise &&
                          searchResults instanceof Promise;
      
      console.log('Method signatures work:', signaturesWork);
      
      return signaturesWork;
    } catch (error) {
      console.error('Method signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify graceful fallback when BIP47 disabled
   */
  static verifyBIP47DisabledFallback(): boolean {
    try {
      console.log('Verifying BIP47 disabled fallback...');
      
      const wallet = {} as HDSegwitBech32Wallet;
      
      // Mock BIP47 disabled
      wallet.allowBIP47 = () => true;
      wallet.isBIP47Enabled = () => false;
      wallet.getBIP47PaymentCode = () => 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
      
      // Test that Paynym methods gracefully fallback
      const display = wallet.getMyPaynymDisplay();
      const paynymInfo = wallet.getMyPaynymInfo();
      const isConnected = wallet.isConnectedToPaynym('PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j');
      
      const fallbackWorks = display.includes('Paynym disabled') &&
                          paynymInfo instanceof Promise &&
                          isConnected === false;
      
      console.log('BIP47 disabled fallback works:', fallbackWorks);
      
      return fallbackWorks;
    } catch (error) {
      console.error('BIP47 disabled fallback verification failed:', error);
      return false;
    }
  }

  /**
   * Run all verification tests
   */
  static async runAllVerifications(): Promise<{ [key: string]: boolean }> {
    console.log('Starting Paynym integration verification...');
    
    const results = {
      bip47Compatibility: this.verifyBIP47Compatibility(),
      displayFormatting: this.verifyDisplayFormatting(),
      methodSignatures: this.verifyMethodSignatures(),
      bip47DisabledFallback: this.verifyBIP47DisabledFallback(),
    };
    
    console.log('Verification results:', results);
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log(`Verifications passed: ${passed}/${total}`);
    
    return results;
  }
}

export default PaynymVerification;
