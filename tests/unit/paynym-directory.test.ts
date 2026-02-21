import assert from 'assert';

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
}));

// Mock fetch
const mockFetch = jest.fn();
jest.mock('../../util/fetch', () => ({
  fetch: (...args: any[]) => mockFetch(...args),
}));

import { PaynymDirectory } from '../../blue_modules/paynym/PaynymDirectory';

// Helper to create a mock fetch response
function mockResponse(status: number, data: Record<string, any>, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: {
      get: (key: string) => headers[key] || null,
    },
  };
}

beforeEach(() => {
  mockFetch.mockClear();
  // Clear mock storage
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
});

describe('PaynymDirectory', () => {
  describe('create', () => {
    it('should handle 201 (new PayNym created)', async () => {
      const responseData = {
        claimed: false,
        nymID: 'nym123',
        nymName: '+silentbot',
        segwit: false,
        token: 'tok_abc',
      };
      mockFetch.mockResolvedValueOnce(mockResponse(201, responseData));

      const result = await PaynymDirectory.create('PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97');

      assert.strictEqual(result.statusCode, 201);
      assert.strictEqual(result.message, 'PayNym created successfully');
      assert.strictEqual(result.value?.nymName, '+silentbot');
      assert.strictEqual(result.value?.claimed, false);
    });

    it('should handle 200 (PayNym already exists)', async () => {
      const responseData = {
        claimed: true,
        nymID: 'nym123',
        nymName: '+silentbot',
        segwit: false,
        token: 'tok_abc',
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, responseData));

      const result = await PaynymDirectory.create('PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97');

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.message, 'PayNym already exists');
      assert.strictEqual(result.value?.claimed, true);
    });

    it('should handle 400 (invalid payment code)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(400, { message: 'Invalid code' }));

      const result = await PaynymDirectory.create('invalid');

      assert.strictEqual(result.statusCode, 400);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.message, 'Bad request: Invalid payment code format');
    });

    it('should handle network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await PaynymDirectory.create('PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97');

      assert.strictEqual(result.statusCode, -1);
      assert.strictEqual(result.value, null);
      assert.ok(result.message.includes('Network error'));
    });
  });

  describe('token', () => {
    it('should return token on 200', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { token: 'fresh_token_123' }));

      const result = await PaynymDirectory.token('PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97');

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.value?.token, 'fresh_token_123');
    });

    it('should handle 404 (payment code not found)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(404, { message: 'Not found' }));

      const result = await PaynymDirectory.token('PM8TNotInDatabase1111111111111111111111111111111111111111111111111111111111111111111111');

      assert.strictEqual(result.statusCode, 404);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.message, 'Payment code was not found in database');
    });
  });

  describe('nym', () => {
    it('should return account info on 200', async () => {
      const accountData = {
        codes: [{ claimed: true, segwit: false, code: 'PM8T...' }],
        followers: [{ nymId: 'nym1' }, { nymId: 'nym2' }],
        following: [{ nymId: 'nym3' }],
        nymID: 'nym123',
        nymName: '+silentbot',
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, accountData));

      const result = await PaynymDirectory.nym('PM8T...');

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.value?.nymName, '+silentbot');
      assert.strictEqual(result.value?.followers.length, 2);
      assert.strictEqual(result.value?.following.length, 1);
    });

    it('should handle 404', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(404, { message: 'Not found' }));

      const result = await PaynymDirectory.nym('+unknownnym');

      assert.strictEqual(result.statusCode, 404);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.message, 'Nym not found');
    });

    it('should pass compact parameter when true', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { nymID: 'x', nymName: 'y', codes: [], followers: [], following: [] }));

      await PaynymDirectory.nym('PM8T...', true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      assert.strictEqual(callBody.compact, true);
    });
  });

  describe('claim', () => {
    it('should handle successful claim (200)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { claimed: 'PM8T...', token: 'new_tok' }));

      const result = await PaynymDirectory.claim('tok123', 'sig_base64');

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.value?.claimed, 'PM8T...');
      assert.strictEqual(result.value?.token, 'new_tok');

      // Verify auth-token header was sent
      const headers = mockFetch.mock.calls[0][1].headers;
      assert.strictEqual(headers['auth-token'], 'tok123');
    });

    it('should handle 401 (unauthorized)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(401, { message: 'Bad signature' }));

      const result = await PaynymDirectory.claim('tok123', 'bad_sig');

      assert.strictEqual(result.statusCode, 401);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.message, 'Unauthorized: Invalid token, signature, or unclaimed payment code');
    });

    it('should handle 400 (already claimed)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(400, { message: 'Already claimed' }));

      const result = await PaynymDirectory.claim('tok123', 'sig');

      assert.strictEqual(result.statusCode, 400);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.message, 'Bad request: Missing signature or already claimed');
    });
  });

  describe('follow', () => {
    it('should handle successful follow (200)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, {
        follower: 'nym1',
        following: 'nym2',
        token: 'new_tok',
      }));

      const result = await PaynymDirectory.follow('tok', 'sig', '+targetnym');

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.value?.follower, 'nym1');
      assert.strictEqual(result.value?.following, 'nym2');
    });

    it('should handle 404 (target not found)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(404, { message: 'Not found' }));

      const result = await PaynymDirectory.follow('tok', 'sig', '+nonexistent');

      assert.strictEqual(result.statusCode, 404);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.message, 'Target nym not found');
    });

    it('should send auth-token header and signature in body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { follower: 'a', following: 'b', token: 't' }));

      await PaynymDirectory.follow('my_token', 'my_sig', '+target');

      const headers = mockFetch.mock.calls[0][1].headers;
      assert.strictEqual(headers['auth-token'], 'my_token');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      assert.strictEqual(body.signature, 'my_sig');
      assert.strictEqual(body.target, '+target');
    });
  });

  describe('unfollow', () => {
    it('should handle successful unfollow (200)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, {
        follower: 'nym1',
        unfollowing: 'nym2',
        token: 'new_tok',
      }));

      const result = await PaynymDirectory.unfollow('tok', 'sig', '+targetnym');

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.value?.unfollowing, 'nym2');
    });

    it('should handle 400 (not following)', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(400, { message: 'Not following' }));

      const result = await PaynymDirectory.unfollow('tok', 'sig', '+target');

      assert.strictEqual(result.statusCode, 400);
      assert.strictEqual(result.value, null);
      assert.strictEqual(result.message, 'Bad request: Not currently following this nym');
    });
  });

  describe('_post Content-Length', () => {
    it('should calculate Content-Length using Buffer.byteLength', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { token: 'x' }));

      await PaynymDirectory.token('PM8T...');

      const headers = mockFetch.mock.calls[0][1].headers;
      const body = mockFetch.mock.calls[0][1].body;
      const expectedLength = Buffer.byteLength(body, 'utf8');
      assert.strictEqual(headers['Content-Length'], expectedLength.toString());
    });

    it('should handle multi-byte characters correctly', async () => {
      // Force a body with multi-byte chars by using a nym with unicode
      mockFetch.mockResolvedValueOnce(mockResponse(200, { nymID: 'x', nymName: 'y', codes: [], followers: [], following: [] }));

      await PaynymDirectory.nym('PM8T\u00e9\u00e8\u00ea'); // accented chars

      const headers = mockFetch.mock.calls[0][1].headers;
      const body = mockFetch.mock.calls[0][1].body;
      const byteLength = Buffer.byteLength(body, 'utf8');
      // String.length !== byte length for multi-byte
      assert.strictEqual(headers['Content-Length'], byteLength.toString());
      assert.ok(byteLength > body.length, 'byte length should exceed string length for multi-byte chars');
    });
  });

  describe('rate limiting (429)', () => {
    it('should retry once after 429 response', async () => {
      const retryResponse = mockResponse(200, { token: 'retry_tok' });
      mockFetch
        .mockResolvedValueOnce(mockResponse(429, {}, { 'Retry-After': '1' }))
        .mockResolvedValueOnce(retryResponse);

      const result = await PaynymDirectory.token('PM8T...');

      assert.strictEqual(mockFetch.mock.calls.length, 2);
      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.value?.token, 'retry_tok');
    }, 10000);
  });

  describe('caching', () => {
    it('should cache PaynymInfo after fetch', async () => {
      const accountData = {
        codes: [{ claimed: true, segwit: false, code: 'PM8T...' }],
        followers: [],
        following: [],
        nymID: 'nym123',
        nymName: '+cached',
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, accountData));

      const result = await PaynymDirectory.getPaynymInfoCached('PM8Ttest');

      assert.strictEqual(result?.nymName, '+cached');
      // Verify it was cached
      const cached = await PaynymDirectory.getCachedPaynymInfo('PM8Ttest');
      assert.strictEqual(cached?.nymName, '+cached');
    });

    it('should return cached data without fetching', async () => {
      // Pre-populate cache
      const cachedInfo = {
        code: 'PM8Ttest',
        nymName: '+fromcache',
        cached_at: Date.now(), // Fresh cache
      };
      mockStorage['paynym_dir_PM8Ttest'] = JSON.stringify(cachedInfo);

      const result = await PaynymDirectory.getPaynymInfoCached('PM8Ttest');

      assert.strictEqual(result?.nymName, '+fromcache');
      assert.strictEqual(mockFetch.mock.calls.length, 0); // No fetch made
    });

    it('should fetch fresh data when cache is expired', async () => {
      // Pre-populate with expired cache (25 hours old)
      const expiredInfo = {
        code: 'PM8Ttest',
        nymName: '+stale',
        cached_at: Date.now() - 25 * 60 * 60 * 1000,
      };
      mockStorage['paynym_dir_PM8Ttest'] = JSON.stringify(expiredInfo);

      const freshData = {
        codes: [],
        followers: [],
        following: [],
        nymID: 'nym123',
        nymName: '+fresh',
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, freshData));

      const result = await PaynymDirectory.getPaynymInfoCached('PM8Ttest');

      assert.strictEqual(result?.nymName, '+fresh');
      assert.strictEqual(mockFetch.mock.calls.length, 1); // Fetch was made
    });

    it('should force refresh when requested', async () => {
      // Pre-populate with fresh cache
      const cachedInfo = {
        code: 'PM8Ttest',
        nymName: '+cached',
        cached_at: Date.now(),
      };
      mockStorage['paynym_dir_PM8Ttest'] = JSON.stringify(cachedInfo);

      const freshData = {
        codes: [],
        followers: [],
        following: [],
        nymID: 'nym123',
        nymName: '+forced',
      };
      mockFetch.mockResolvedValueOnce(mockResponse(200, freshData));

      const result = await PaynymDirectory.getPaynymInfoCached('PM8Ttest', true);

      assert.strictEqual(result?.nymName, '+forced');
      assert.strictEqual(mockFetch.mock.calls.length, 1);
    });

    it('clearCache should remove all paynym keys', async () => {
      mockStorage['paynym_dir_PM8Ta'] = '{}';
      mockStorage['paynym_dir_PM8Tb'] = '{}';
      mockStorage['other_key'] = 'kept';

      await PaynymDirectory.clearCache();

      assert.strictEqual(mockStorage['paynym_dir_PM8Ta'], undefined);
      assert.strictEqual(mockStorage['paynym_dir_PM8Tb'], undefined);
      assert.strictEqual(mockStorage['other_key'], 'kept');
    });
  });

  describe('backward compatibility wrappers', () => {
    it('claimPaynym should create, get token, sign it, then claim', async () => {
      // First call: create endpoint (idempotent)
      mockFetch.mockResolvedValueOnce(mockResponse(200, { code: 'PM8T...' }));
      // Second call: token endpoint
      mockFetch.mockResolvedValueOnce(mockResponse(200, { token: 'auth_tok' }));
      // Third call: claim endpoint
      mockFetch.mockResolvedValueOnce(mockResponse(200, { claimed: 'PM8T...', token: 'new_tok' }));

      const signToken = jest.fn().mockResolvedValue('signed_auth_tok');
      const result = await PaynymDirectory.claimPaynym('PM8T...', signToken);

      // Verify signToken was called with the token we received
      assert.strictEqual(signToken.mock.calls[0][0], 'auth_tok');
      assert.strictEqual(mockFetch.mock.calls.length, 3);
      assert.strictEqual(result.claimed, 'PM8T...');

      // Verify the claim request used the signature from signToken
      const claimBody = JSON.parse(mockFetch.mock.calls[2][1].body);
      assert.strictEqual(claimBody.signature, 'signed_auth_tok');
    });

    it('claimPaynym should throw when token fails', async () => {
      // First call: create endpoint succeeds
      mockFetch.mockResolvedValueOnce(mockResponse(200, { code: 'PM8T...' }));
      // Second call: token endpoint fails
      mockFetch.mockResolvedValueOnce(mockResponse(404, { message: 'Not found' }));

      const signToken = jest.fn();
      await assert.rejects(
        () => PaynymDirectory.claimPaynym('PM8T...', signToken),
        /Failed to get token/,
      );
      // signToken should never be called if token fetch fails
      assert.strictEqual(signToken.mock.calls.length, 0);
    });

    it('getToken should return token string or null', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(200, { token: 'my_token' }));

      const token = await PaynymDirectory.getToken('PM8T...');
      assert.strictEqual(token, 'my_token');
    });

    it('getToken should return null on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'));

      const token = await PaynymDirectory.getToken('PM8T...');
      assert.strictEqual(token, null);
    });
  });
});
