// Type declarations for global objects
declare const console: {
  log: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
};

import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import PaynymDirectory from '../../blue_modules/paynym/PaynymDirectory';
import PaynymDisplayUtils from '../../blue_modules/paynym/PaynymDisplayUtils';
import { PaynymInfo } from '../../blue_modules/paynym/PaynymDirectory';
import * as bitcoinMessage from 'bitcoinjs-message';

/**
 * HD Wallet (BIP39).
 * In particular, BIP84 (Bech32 Native Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 */
export class HDSegwitBech32Wallet extends AbstractHDElectrumWallet {
  static readonly type = 'HDsegwitBech32';
  static readonly typeReadable = 'HD SegWit (BIP84 Bech32 Native)';
  // @ts-ignore: override
  public readonly type = HDSegwitBech32Wallet.type;
  // @ts-ignore: override
  public readonly typeReadable = HDSegwitBech32Wallet.typeReadable;
  public readonly segwitType = 'p2wpkh';
  static readonly derivationPath = "m/84'/0'/0'";

  allowSend() {
    return true;
  }

  allowRBF() {
    return true;
  }

  allowPayJoin() {
    return true;
  }

  allowCosignPsbt() {
    return true;
  }

  isSegwit() {
    return true;
  }

  allowSignVerifyMessage() {
    return true;
  }

  allowMasterFingerprint() {
    return true;
  }

  allowXpub() {
    return true;
  }

  allowBIP47() {
    return true;
  }

  allowSilentPaymentSend(): boolean {
    return true;
  }

  /**
   * Get Paynym information for this wallet's payment code
   * @param forceRefresh - Force refresh from directory
   * @returns Promise<PaynymInfo | null>
   */
  async getMyPaynymInfo(
    forceRefresh: boolean = false,
  ): Promise<PaynymInfo | null> {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      return null;
    }

    const paymentCode = this.getBIP47PaymentCode();
    if (!paymentCode) {
      return null;
    }

    return await PaynymDirectory.getPaynymInfoCached(paymentCode, forceRefresh);
  }

  /**
   * Get display name for this wallet
   * @returns Formatted display name
   */
  getMyPaynymDisplay(): string {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      return this.getBIP47PaymentCode() || 'Paynym disabled';
    }

    const paymentCode = this.getBIP47PaymentCode();
    if (!paymentCode) {
      return 'No payment code';
    }

    return PaynymDisplayUtils.formatPaymentCode(paymentCode);
  }

  /**
   * Check if Paynym is claimed
   * @returns Promise<boolean>
   */
  async isMyPaynymClaimed(): Promise<boolean> {
    const paynymInfo = await this.getMyPaynymInfo();
    return paynymInfo !== null;
  }

  /**
   * Claim this wallet's Paynym (register with directory)
   * @param signature - Signed message for verification
   * @returns Promise<any>
   */
  async claimMyPaynym(signature: string): Promise<any> {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      throw new Error('BIP47 is not enabled for this wallet');
    }

    const paymentCode = this.getBIP47PaymentCode();
    if (!paymentCode) {
      throw new Error('No payment code available for claiming');
    }

    return await PaynymDirectory.claimPaynym(paymentCode, signature);
  }

  /**
   * Generate signature for Paynym claim
   * Signs token bytes directly with BIP47 notification address private key
   * @param token - Token from paynym.rs API
   * @returns Promise<string> Hex-encoded signature
   */
  async generatePaynymClaimSignature(token: string): Promise<string> {
    console.log('[PAYNYM DEBUG] Step 0: Starting signature generation');
    console.log('[PAYNYM DEBUG] Token length:', token?.length);

    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      throw new Error('BIP47 is not enabled for this wallet');
    }

    const paymentCode = this.getBIP47PaymentCode();
    if (!paymentCode) {
      throw new Error('No payment code available');
    }
    console.log('[PAYNYM DEBUG] Step 1: Got payment code');

    // Use existing BIP47 instance to get notification node directly
    const bip47Instance = this.getBIP47FromSeed();
    console.log('[PAYNYM DEBUG] Step 2: Got BIP47 instance:', !!bip47Instance);

    // Create ECPair using existing wallet pattern
    // @ts-ignore: using dynamic require like parent class
    const ecpairModule = require('ecpair');
    console.log(
      '[PAYNYM DEBUG] Step 3: Required ecpair module:',
      typeof ecpairModule,
    );
    console.log(
      '[PAYNYM DEBUG] Step 3a: ecpairModule.ECPairFactory:',
      typeof ecpairModule.ECPairFactory,
    );
    console.log(
      '[PAYNYM DEBUG] Step 3b: ecpairModule.default:',
      typeof ecpairModule.default,
    );

    // @ts-ignore: using dynamic require like parent class
    const ecc = require('../../blue_modules/noble_ecc');
    console.log('[PAYNYM DEBUG] Step 4: Required ecc:', typeof ecc);
    console.log('[PAYNYM DEBUG] Step 4a: ecc.default:', typeof ecc.default);

    // Try both default export and named export
    const ECPairFactory =
      ecpairModule.ECPairFactory || ecpairModule.default || ecpairModule;
    console.log(
      '[PAYNYM DEBUG] Step 4b: ECPairFactory resolved:',
      typeof ECPairFactory,
    );

    const eccLib = ecc.default || ecc;
    console.log('[PAYNYM DEBUG] Step 4c: ecc resolved:', typeof eccLib);

    const ECPair = ECPairFactory(eccLib);
    console.log('[PAYNYM DEBUG] Step 5: Created ECPair:', typeof ECPair);
    console.log(
      '[PAYNYM DEBUG] Step 5a: ECPair.fromPrivateKey exists:',
      typeof ECPair.fromPrivateKey,
    );
    console.log(
      '[PAYNYM DEBUG] Step 5b: ECPair.fromWIF exists:',
      typeof ECPair.fromWIF,
    );

    // Get notification node directly from BIP47 instance
    const notificationNode = bip47Instance.getNotificationNode();
    console.log(
      '[PAYNYM DEBUG] Step 6: Got notification node:',
      !!notificationNode,
    );
    console.log(
      '[PAYNYM DEBUG] Step 7: notificationNode type:',
      notificationNode?.constructor?.name,
    );
    console.log(
      '[PAYNYM DEBUG] Step 8: Private key exists:',
      !!notificationNode?.privateKey,
    );
    console.log(
      '[PAYNYM DEBUG] Step 9: Private key type:',
      notificationNode?.privateKey?.constructor?.name,
    );
    console.log(
      '[PAYNYM DEBUG] Step 10: Private key length:',
      notificationNode?.privateKey?.length,
    );

    if (!notificationNode || !notificationNode.privateKey) {
      throw new Error('Failed to derive notification private key');
    }

    // Create ECPair from notification node private key
    console.log(
      '[PAYNYM DEBUG] Step 11: About to call ECPair.fromPrivateKey...',
    );
    const keyPair = ECPair.fromPrivateKey(notificationNode.privateKey);
    console.log('[PAYNYM DEBUG] Step 12: Created keypair:', !!keyPair);

    // Use Bitcoin message signing (like BitcoinJ's ECKey.signMessage())
    // This matches Samourai/Sparrow implementation
    console.log('[PAYNYM DEBUG] Step 13: About to sign message...');
    console.log('[PAYNYM DEBUG] Step 14: Signing token string (not hashed)');

    // Sign the raw token string using Bitcoin message signing standard
    // bitcoinMessage.sign() will:
    // 1. Add magic bytes: "\x18Bitcoin Signed Message:\n" + length + message
    // 2. Double SHA256 hash the prefixed message
    // 3. Sign with recoverable ECDSA (65 bytes: recovery flag + r + s)
    // 4. Return Buffer that can be base64 encoded
    const signature = bitcoinMessage.sign(
      token, // Sign the raw token string, not bytes
      notificationNode.privateKey, // BIP47 notification private key
      true, // Use compressed public key format
    );

    console.log(
      '[PAYNYM DEBUG] Step 15: Signed! Signature buffer length:',
      signature?.length,
    );
    console.log(
      '[PAYNYM DEBUG] Step 16: Signature type:',
      signature?.constructor?.name,
    );

    // Convert signature to base64 string (NOT hex!)
    // Paynym API expects base64 format (like BitcoinJ's ECKey.signMessage())
    const signatureBase64 = signature.toString('base64');
    console.log(
      '[PAYNYM DEBUG] Step 17: Signature base64 (first 40 chars):',
      signatureBase64.substring(0, 40),
    );
    console.log(
      '[PAYNYM DEBUG] Step 18: Signature base64 length:',
      signatureBase64.length,
    );
    console.log(
      '[PAYNYM DEBUG] Step 19: Signature base64 (last 20 chars):',
      signatureBase64.substring(signatureBase64.length - 20),
    );

    return signatureBase64;
  }

  /**
   * Get Paynym info for any payment code
   * @param paymentCode - BIP47 payment code
   * @param forceRefresh - Force refresh from directory
   * @returns Promise<PaynymInfo | null>
   */
  async getPaynymInfo(
    paymentCode: string,
    forceRefresh: boolean = false,
  ): Promise<PaynymInfo | null> {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      return null;
    }

    if (!PaynymDisplayUtils.isValidPaymentCode(paymentCode)) {
      throw new Error('Invalid payment code format');
    }

    return await PaynymDirectory.getPaynymInfoCached(paymentCode, forceRefresh);
  }

  /**
   * Check if connected to a Paynym (BIP47 notification sent)
   * @param paymentCode - BIP47 payment code
   * @returns boolean
   */
  isConnectedToPaynym(paymentCode: string): boolean {
    const notificationTx = this.getBIP47NotificationTransaction(paymentCode);
    return !!notificationTx;
  }

  /**
   * Get following list for a Paynym
   * @param paymentCode - BIP47 payment code
   * @returns Promise<PaynymInfo[]>
   */
  async getPaynymFollowing(paymentCode: string): Promise<PaynymInfo[]> {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      return [];
    }

    return await PaynymDirectory.getFollowing(paymentCode);
  }

  /**
   * Get followers list for a Paynym
   * @param paymentCode - BIP47 payment code
   * @returns Promise<PaynymInfo[]>
   */
  async getPaynymFollowers(paymentCode: string): Promise<PaynymInfo[]> {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      return [];
    }

    return await PaynymDirectory.getFollowers(paymentCode);
  }

  /**
   * Get avatar URL for a payment code
   * @param paymentCode - BIP47 payment code
   * @returns Promise<string | null>
   */
  async getPaynymAvatar(paymentCode: string): Promise<string | null> {
    if (!paymentCode) {
      return null;
    }
    return PaynymDisplayUtils.getAvatarUrl(paymentCode);
  }

  /**
   * Get all payment codes with their Paynym display info
   * @param forceRefresh - Force refresh from directory
   * @returns Promise<Array<{paymentCode: string, paynymInfo: PaynymInfo | null, display: string}>>
   */
  async getConnectedPaynyms(forceRefresh: boolean = false): Promise<
    Array<{
      paymentCode: string;
      paynymInfo: PaynymInfo | null;
      display: string;
    }>
  > {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      return [];
    }

    const senderPaymentCodes = this.getBIP47SenderPaymentCodes();
    const receiverPaymentCodes = this.getBIP47ReceiverPaymentCodes();
    const allPaymentCodes = [...senderPaymentCodes, ...receiverPaymentCodes];

    const results = [];
    for (const paymentCode of allPaymentCodes) {
      try {
        const paynymInfo = paymentCode
          ? await PaynymDirectory.getPaynymInfoCached(paymentCode, forceRefresh)
          : null;
        const display = paynymInfo
          ? PaynymDisplayUtils.formatPaymentCode(paymentCode, paynymInfo)
          : PaynymDisplayUtils.formatPaymentCode(paymentCode);

        results.push({
          paymentCode,
          paynymInfo,
          display,
        });
      } catch (error) {
        console.error(`Error fetching Paynym info for ${paymentCode}:`, error);
        results.push({
          paymentCode,
          paynymInfo: null,
          display: PaynymDisplayUtils.formatPaymentCode(paymentCode),
        });
      }
    }

    return results;
  }

  /**
   * Search for Paynyms by name or payment code
   * @param query - Search query
   * @returns Promise<Array<{paymentCode: string, paynymInfo: PaynymInfo | null, display: string}>>
   */
  async searchPaynyms(query: string): Promise<
    Array<{
      paymentCode: string;
      paynymInfo: PaynymInfo | null;
      display: string;
    }>
  > {
    if (!this.allowBIP47() || !this.isBIP47Enabled()) {
      return [];
    }

    // For now, only search by exact payment code or cached Paynym names
    const senderPaymentCodes = this.getBIP47SenderPaymentCodes();
    const receiverPaymentCodes = this.getBIP47ReceiverPaymentCodes();
    const allPaymentCodes = [...senderPaymentCodes, ...receiverPaymentCodes];

    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const paymentCode of allPaymentCodes) {
      try {
        const paynymInfo = paymentCode
          ? await PaynymDirectory.getPaynymInfoCached(paymentCode)
          : null;
        const display = paynymInfo
          ? PaynymDisplayUtils.formatPaymentCode(paymentCode, paynymInfo)
          : PaynymDisplayUtils.formatPaymentCode(paymentCode);

        // Check if payment code matches or if Paynym name matches
        if (
          paymentCode.toLowerCase().includes(lowerQuery) ||
          (paynymInfo?.nymName &&
            paynymInfo.nymName.toLowerCase().includes(lowerQuery))
        ) {
          results.push({
            paymentCode,
            paynymInfo,
            display,
          });
        }
      } catch (error) {
        console.error(`Error searching Paynym for ${paymentCode}:`, error);
      }
    }

    return results;
  }
}
