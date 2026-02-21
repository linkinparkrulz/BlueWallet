import assert from 'assert';

import PaynymDisplayUtils from '../../blue_modules/paynym/PaynymDisplayUtils';
import { PaynymInfo } from '../../blue_modules/paynym/PaynymDirectory';

describe('PaynymDisplayUtils', () => {
  describe('isValidPaymentCode', () => {
    it('should accept valid PM8T payment codes', () => {
      const validCode =
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';
      assert.strictEqual(PaynymDisplayUtils.isValidPaymentCode(validCode), true);
    });

    it('should reject codes not starting with PM8T', () => {
      assert.strictEqual(PaynymDisplayUtils.isValidPaymentCode('XM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhP'), false);
    });

    it('should reject codes shorter than 50 chars', () => {
      assert.strictEqual(PaynymDisplayUtils.isValidPaymentCode('PM8TJS2JxQ5zt'), false);
    });

    it('should reject empty string', () => {
      assert.strictEqual(PaynymDisplayUtils.isValidPaymentCode(''), false);
    });

    it('should reject codes with invalid base58 characters', () => {
      // 0, O, I, l are not valid base58
      assert.strictEqual(
        PaynymDisplayUtils.isValidPaymentCode('PM8T0000000000000000000000000000000000000000000000000'),
        false,
      );
    });
  });

  describe('formatPaymentCode', () => {
    it('should return nymName when paynymInfo has one', () => {
      const info: PaynymInfo = { code: 'PM8T...', nymName: '+silentbob' };
      assert.strictEqual(PaynymDisplayUtils.formatPaymentCode('PM8Tabc', info), '+silentbob');
    });

    it('should truncate long payment codes to 20 chars', () => {
      const longCode =
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';
      const result = PaynymDisplayUtils.formatPaymentCode(longCode);
      assert.strictEqual(result, 'PM8TJS2JxQ5ztXUpBBRn...');
    });

    it('should return short codes as-is', () => {
      assert.strictEqual(PaynymDisplayUtils.formatPaymentCode('shortcode'), 'shortcode');
    });

    it('should prefer nymName over truncation', () => {
      const longCode =
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';
      const info: PaynymInfo = { code: longCode, nymName: '+testnym' };
      assert.strictEqual(PaynymDisplayUtils.formatPaymentCode(longCode, info), '+testnym');
    });
  });

  describe('getAvatarUrl', () => {
    it('should construct paynym.rs avatar URL', () => {
      assert.strictEqual(
        PaynymDisplayUtils.getAvatarUrl('PM8Tabc123'),
        'https://paynym.rs/PM8Tabc123/avatar',
      );
    });

    it('should return null for empty string', () => {
      assert.strictEqual(PaynymDisplayUtils.getAvatarUrl(''), null);
    });
  });

  describe('getDisplayName', () => {
    it('should return nymName when available', () => {
      const info: PaynymInfo = { code: 'PM8T...', nymName: '+coolnym' };
      assert.strictEqual(PaynymDisplayUtils.getDisplayName(info), '+coolnym');
    });

    it('should fall back to paymentCode when no nymName', () => {
      const info: PaynymInfo = { code: 'PM8T...' };
      assert.strictEqual(PaynymDisplayUtils.getDisplayName(info, 'PM8Tabc'), 'PM8Tabc');
    });

    it('should return Unknown when no info and no code', () => {
      assert.strictEqual(PaynymDisplayUtils.getDisplayName(undefined), 'Unknown');
    });

    it('should return paymentCode when no paynymInfo', () => {
      assert.strictEqual(PaynymDisplayUtils.getDisplayName(undefined, 'PM8Tabc'), 'PM8Tabc');
    });
  });

  describe('formatFollowersCount', () => {
    it('should handle zero', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowersCount(0), 'No followers');
    });

    it('should handle undefined', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowersCount(undefined), 'No followers');
    });

    it('should handle singular', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowersCount(1), '1 follower');
    });

    it('should handle plural', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowersCount(42), '42 followers');
    });
  });

  describe('formatFollowingCount', () => {
    it('should handle zero', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowingCount(0), 'Not following anyone');
    });

    it('should handle undefined', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowingCount(undefined), 'Not following anyone');
    });

    it('should handle singular', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowingCount(1), 'Following 1');
    });

    it('should handle plural', () => {
      assert.strictEqual(PaynymDisplayUtils.formatFollowingCount(5), 'Following 5');
    });
  });

  describe('isSamePaynym', () => {
    it('should return true for matching codes', () => {
      const a: PaynymInfo = { code: 'PM8Tabc' };
      const b: PaynymInfo = { code: 'PM8Tabc' };
      assert.strictEqual(PaynymDisplayUtils.isSamePaynym(a, b), true);
    });

    it('should return false for different codes', () => {
      const a: PaynymInfo = { code: 'PM8Tabc' };
      const b: PaynymInfo = { code: 'PM8Txyz' };
      assert.strictEqual(PaynymDisplayUtils.isSamePaynym(a, b), false);
    });

    it('should return false when either is null', () => {
      const a: PaynymInfo = { code: 'PM8Tabc' };
      assert.strictEqual(PaynymDisplayUtils.isSamePaynym(a, null), false);
      assert.strictEqual(PaynymDisplayUtils.isSamePaynym(null, a), false);
      assert.strictEqual(PaynymDisplayUtils.isSamePaynym(null, null), false);
    });
  });

  describe('getShortPaymentCode', () => {
    it('should truncate long PM8T codes to 15 chars', () => {
      const longCode =
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhP';
      assert.strictEqual(PaynymDisplayUtils.getShortPaymentCode(longCode), 'PM8TJS2JxQ5ztXU...');
    });

    it('should return short codes as-is', () => {
      assert.strictEqual(PaynymDisplayUtils.getShortPaymentCode('PM8Tshort'), 'PM8Tshort');
    });
  });

  describe('getPaynymSummary', () => {
    it('should return Unclaimed Paynym for undefined', () => {
      assert.strictEqual(PaynymDisplayUtils.getPaynymSummary(undefined), 'Unclaimed Paynym');
    });

    it('should format summary with name, followers, following', () => {
      const info: PaynymInfo = {
        code: 'PM8T...',
        nymName: '+testbot',
        followers: 10,
        following: 5,
      };
      assert.strictEqual(
        PaynymDisplayUtils.getPaynymSummary(info),
        '+testbot \u2022 10 followers \u2022 Following 5',
      );
    });
  });

  describe('getConnectionStatus', () => {
    it('should return Connected when true', () => {
      assert.strictEqual(PaynymDisplayUtils.getConnectionStatus(true), 'Connected');
    });

    it('should return Not connected when false', () => {
      assert.strictEqual(PaynymDisplayUtils.getConnectionStatus(false), 'Not connected');
    });
  });

  describe('sortByName', () => {
    it('should sort by nymName alphabetically', () => {
      const paynyms: PaynymInfo[] = [
        { code: 'c', nymName: '+charlie' },
        { code: 'a', nymName: '+alice' },
        { code: 'b', nymName: '+bob' },
      ];
      const sorted = PaynymDisplayUtils.sortByName(paynyms);
      assert.strictEqual(sorted[0].nymName, '+alice');
      assert.strictEqual(sorted[1].nymName, '+bob');
      assert.strictEqual(sorted[2].nymName, '+charlie');
    });

    it('should fall back to code when no nymName', () => {
      const paynyms: PaynymInfo[] = [
        { code: 'PM8Tz' },
        { code: 'PM8Ta' },
      ];
      const sorted = PaynymDisplayUtils.sortByName(paynyms);
      assert.strictEqual(sorted[0].code, 'PM8Ta');
      assert.strictEqual(sorted[1].code, 'PM8Tz');
    });

    it('should be case-insensitive', () => {
      const paynyms: PaynymInfo[] = [
        { code: 'b', nymName: '+Bob' },
        { code: 'a', nymName: '+alice' },
      ];
      const sorted = PaynymDisplayUtils.sortByName(paynyms);
      assert.strictEqual(sorted[0].nymName, '+alice');
      assert.strictEqual(sorted[1].nymName, '+Bob');
    });
  });

  describe('createSearchSuggestion', () => {
    it('should create suggestion with display text and short code', () => {
      const longCode =
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97';
      const suggestion = PaynymDisplayUtils.createSearchSuggestion(longCode);
      assert.strictEqual(suggestion.paymentCode, longCode);
      assert.strictEqual(suggestion.displayText, 'PM8TJS2JxQ5ztXUpBBRn...');
      assert.strictEqual(suggestion.shortCode, 'PM8TJS2JxQ5ztXU...');
    });
  });
});
