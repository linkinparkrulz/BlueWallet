import assert from 'assert';

// Mock PaynymDirectory (used by abstract-hd-electrum-wallet.ts and hd-segwit-bech32-wallet.ts)
const mockNym = jest.fn();
jest.mock('../../blue_modules/paynym/PaynymDirectory', () => ({
  PaynymDirectory: {
    nym: mockNym,
  },
  __esModule: true,
  default: {
    nym: mockNym,
  },
}));

// Mock PaynymDisplayUtils (imported by hd-segwit-bech32-wallet.ts)
jest.mock('../../blue_modules/paynym/PaynymDisplayUtils', () => ({
  __esModule: true,
  default: {
    formatPaymentCode: (code: string) => code.substring(0, 12) + '...',
    isValidPaymentCode: () => true,
    getAvatarUrl: () => null,
  },
  PaynymDisplayUtils: {
    formatPaymentCode: (code: string) => code.substring(0, 12) + '...',
    isValidPaymentCode: () => true,
    getAvatarUrl: () => null,
  },
}));

import { HDSegwitBech32Wallet } from '../../class';

// Known valid BIP47 payment codes from test vectors
const BOB_PC = 'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';
const ALICE_PC = 'PM8TJXuZNUtSibuXKFM6bhCxpNaSye6r4px2GXRV5v86uRdH9Raa8ZtXEkG7S4zLREf4ierjMsxLXSFTbRVUnRmvjw9qnc7zZbyXyBstSmjcb7uVcDYF';
const CHARLIE_PC = 'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo';

const TEST_MNEMONIC = 'reward upper indicate eight swift arch injury crystal super wrestle already dentist';

describe('BIP47 wallet methods', () => {
  beforeEach(() => {
    mockNym.mockClear();
  });

  describe('addBIP47Receiver — bidirectional support', () => {
    it('allows same code in both receive and send lists (bidirectional BIP47)', () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);

      // Simulate someone sent us a notification tx — their code is in receive list
      w._receive_payment_codes = [ALICE_PC];

      // Now we want to pay them back — add to send list
      w.addBIP47Receiver(ALICE_PC);

      // Must exist in BOTH lists for bidirectional payments
      assert.ok(w._receive_payment_codes.includes(ALICE_PC), 'Should remain in receive list');
      assert.ok(w._send_payment_codes.includes(ALICE_PC), 'Should be added to send list');
    });

    it('prevents duplicates within send list', () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);

      w.addBIP47Receiver(ALICE_PC);
      w.addBIP47Receiver(ALICE_PC);

      assert.strictEqual(w._send_payment_codes.length, 1);
    });

    it('adds new code to empty send list', () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);

      assert.strictEqual(w._send_payment_codes.length, 0);
      w.addBIP47Receiver(BOB_PC);
      assert.strictEqual(w._send_payment_codes.length, 1);
      assert.strictEqual(w._send_payment_codes[0], BOB_PC);
    });

    it('allows multiple different codes in send list', () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);

      w.addBIP47Receiver(ALICE_PC);
      w.addBIP47Receiver(BOB_PC);
      w.addBIP47Receiver(CHARLIE_PC);

      assert.strictEqual(w._send_payment_codes.length, 3);
    });
  });

  describe('fetchBIP47ReceiverPaymentCodesViaPaynym', () => {
    it('picks only the claimed payment code from a nym profile', async () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);
      w.switchBIP47(true);

      const myPC = w.getBIP47PaymentCode();

      mockNym.mockImplementation(async (codeOrId: string) => {
        if (codeOrId === myPC) {
          // My own profile — following Alice
          return {
            value: {
              nymID: 'my_nym',
              following: [{ nymId: 'alice_nym' }],
              codes: [{ code: myPC, claimed: true }],
            },
            statusCode: 200,
            message: 'OK',
          };
        }
        if (codeOrId === 'alice_nym') {
          // Alice has TWO codes — only one is claimed
          return {
            value: {
              nymID: 'alice_nym',
              codes: [
                { code: CHARLIE_PC, claimed: false },
                { code: ALICE_PC, claimed: true },
              ],
            },
            statusCode: 200,
            message: 'OK',
          };
        }
        return { value: null, statusCode: 404, message: 'Not found' };
      });

      await w.fetchBIP47ReceiverPaymentCodesViaPaynym();

      assert.ok(w._send_payment_codes.includes(ALICE_PC), 'Should include the claimed code');
      assert.ok(!w._send_payment_codes.includes(CHARLIE_PC), 'Should NOT include the unclaimed code');
      assert.strictEqual(w._send_payment_codes.length, 1);
    });

    it('falls back to first code if none are claimed', async () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);
      w.switchBIP47(true);

      const myPC = w.getBIP47PaymentCode();

      mockNym.mockImplementation(async (codeOrId: string) => {
        if (codeOrId === myPC) {
          return {
            value: {
              nymID: 'my_nym',
              following: [{ nymId: 'bob_nym' }],
              codes: [{ code: myPC, claimed: true }],
            },
            statusCode: 200,
            message: 'OK',
          };
        }
        if (codeOrId === 'bob_nym') {
          // No claimed codes — should fall back to first
          return {
            value: {
              nymID: 'bob_nym',
              codes: [
                { code: CHARLIE_PC, claimed: false },
                { code: ALICE_PC, claimed: false },
              ],
            },
            statusCode: 200,
            message: 'OK',
          };
        }
        return { value: null, statusCode: 404, message: 'Not found' };
      });

      await w.fetchBIP47ReceiverPaymentCodesViaPaynym();

      assert.ok(w._send_payment_codes.includes(CHARLIE_PC), 'Should fall back to first code');
      assert.strictEqual(w._send_payment_codes.length, 1);
    });

    it('handles undefined following without crashing', async () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);
      w.switchBIP47(true);

      const myPC = w.getBIP47PaymentCode();

      mockNym.mockResolvedValue({
        value: {
          nymID: 'my_nym',
          // following is undefined (API returned partial data)
          codes: [{ code: myPC, claimed: true }],
        },
        statusCode: 200,
        message: 'OK',
      });

      // Should not throw
      await w.fetchBIP47ReceiverPaymentCodesViaPaynym();
      assert.strictEqual(w._send_payment_codes.length, 0);
    });

    it('handles empty following array', async () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);
      w.switchBIP47(true);

      const myPC = w.getBIP47PaymentCode();

      mockNym.mockResolvedValue({
        value: {
          nymID: 'my_nym',
          following: [],
          codes: [{ code: myPC, claimed: true }],
        },
        statusCode: 200,
        message: 'OK',
      });

      await w.fetchBIP47ReceiverPaymentCodesViaPaynym();
      assert.strictEqual(w._send_payment_codes.length, 0);
    });

    it('skips codes already in send list', async () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);
      w.switchBIP47(true);

      const myPC = w.getBIP47PaymentCode();

      // Pre-populate: Alice already in send list
      w._send_payment_codes = [ALICE_PC];

      mockNym.mockImplementation(async (codeOrId: string) => {
        if (codeOrId === myPC) {
          return {
            value: {
              nymID: 'my_nym',
              following: [{ nymId: 'alice_nym' }],
              codes: [{ code: myPC, claimed: true }],
            },
            statusCode: 200,
            message: 'OK',
          };
        }
        if (codeOrId === 'alice_nym') {
          return {
            value: {
              nymID: 'alice_nym',
              codes: [{ code: ALICE_PC, claimed: true }],
            },
            statusCode: 200,
            message: 'OK',
          };
        }
        return { value: null, statusCode: 404, message: 'Not found' };
      });

      await w.fetchBIP47ReceiverPaymentCodesViaPaynym();

      // Should not duplicate
      assert.strictEqual(w._send_payment_codes.length, 1);
      assert.strictEqual(w._send_payment_codes[0], ALICE_PC);
    });

    it('does nothing when BIP47 is disabled', async () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);
      // BIP47 NOT enabled (default)

      await w.fetchBIP47ReceiverPaymentCodesViaPaynym();

      assert.strictEqual(mockNym.mock.calls.length, 0, 'Should not call PaynymDirectory');
      assert.strictEqual(w._send_payment_codes.length, 0);
    });

    it('handles nym API returning non-200 gracefully', async () => {
      const w = new HDSegwitBech32Wallet();
      w.setSecret(TEST_MNEMONIC);
      w.switchBIP47(true);

      mockNym.mockResolvedValue({
        value: null,
        statusCode: 404,
        message: 'Not found',
      });

      // Should not throw — the method has a try/catch
      await w.fetchBIP47ReceiverPaymentCodesViaPaynym();
      assert.strictEqual(w._send_payment_codes.length, 0);
    });
  });
});
