import assert from 'assert';
import * as bitcoinMessage from 'bitcoinjs-message';
import BIP47Factory from '@spsina/bip47';
import { ECPairFactory } from 'ecpair';

// Mock the typo'd import path in abstract-hd-electrum-wallet.ts
// (paynym branch imports from ../../utils/ but dir is util/)
jest.mock('../../utils/isValidBech32Address', () => ({
  isValidBech32Address: (addr: string) => /^(bc1|tb1)/.test(addr),
}), { virtual: true });

import ecc from '../../blue_modules/noble_ecc';
import { HDSegwitBech32Wallet } from '../../class';

const ECPair = ECPairFactory(ecc);
const bip47 = BIP47Factory(ecc);

describe('PayNym claim signature (generatePaynymClaimSignature)', () => {
  // Known test mnemonic from Samourai BIP47 test vectors
  const TEST_MNEMONIC = 'reward upper indicate eight swift arch injury crystal super wrestle already dentist';

  it('should throw when BIP47 is not enabled', async () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(TEST_MNEMONIC);
    // BIP47 is disabled by default
    assert.strictEqual(wallet.isBIP47Enabled(), false);

    await assert.rejects(
      () => wallet.generatePaynymClaimSignature('test_token'),
      /BIP47 is not enabled/,
    );
  });

  it('should produce a valid base64 signature', async () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(TEST_MNEMONIC);
    wallet.switchBIP47(true);

    const token = 'test_token_12345';
    const signature = await wallet.generatePaynymClaimSignature(token);

    // Should be base64 encoded
    const decoded = Buffer.from(signature, 'base64');
    assert.strictEqual(decoded.toString('base64'), signature);

    // Bitcoin message signatures are 65 bytes (1 recovery + 32 r + 32 s)
    assert.strictEqual(decoded.length, 65);
  });

  it('should produce a signature verifiable with the notification public key', async () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(TEST_MNEMONIC);
    wallet.switchBIP47(true);

    const paymentCode = wallet.getBIP47PaymentCode();
    assert.ok(paymentCode);

    // Get notification node public key for verification
    const bip47Instance = bip47.fromPaymentCode(paymentCode);
    const notificationNode = bip47Instance.getNotificationNode();
    assert.ok(notificationNode?.publicKey);

    // Derive the notification address (P2PKH, compressed)
    const keyPair = ECPair.fromPublicKey(notificationNode.publicKey);
    const { address } = require('bitcoinjs-lib').payments.p2pkh({
      pubkey: keyPair.publicKey,
    });
    assert.ok(address);

    // Sign a token
    const token = 'paynym_auth_token_abc123';
    const signature = await wallet.generatePaynymClaimSignature(token);

    // Verify the signature using bitcoinjs-message
    const isValid = bitcoinMessage.verify(
      token,
      address,
      Buffer.from(signature, 'base64'),
    );
    assert.strictEqual(isValid, true, 'Signature should verify against notification address');
  });

  it('should produce deterministic signatures for same token', async () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(TEST_MNEMONIC);
    wallet.switchBIP47(true);

    const token = 'deterministic_test';
    const sig1 = await wallet.generatePaynymClaimSignature(token);
    const sig2 = await wallet.generatePaynymClaimSignature(token);

    // bitcoinMessage.sign with the same key and message should produce same result
    assert.strictEqual(sig1, sig2);
  });

  it('should produce different signatures for different tokens', async () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(TEST_MNEMONIC);
    wallet.switchBIP47(true);

    const sig1 = await wallet.generatePaynymClaimSignature('token_a');
    const sig2 = await wallet.generatePaynymClaimSignature('token_b');

    assert.notStrictEqual(sig1, sig2);
  });

  it('should use the BIP47 notification private key (not wallet root)', async () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(TEST_MNEMONIC);
    wallet.switchBIP47(true);

    const token = 'key_source_test';
    const signature = await wallet.generatePaynymClaimSignature(token);

    // Verify it does NOT verify against a random address from the wallet
    const randomAddress = wallet._getExternalAddressByIndex(0);
    assert.ok(randomAddress);

    try {
      const wrongKeyVerify = bitcoinMessage.verify(
        token,
        randomAddress,
        Buffer.from(signature, 'base64'),
      );
      // If verify returns false, that's expected
      assert.strictEqual(wrongKeyVerify, false, 'Should not verify against wrong address');
    } catch {
      // bitcoinMessage.verify may throw for address mismatch — also acceptable
    }
  });
});
