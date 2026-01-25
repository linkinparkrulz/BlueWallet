// Type declarations for global objects
declare const console: {
  log: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
  warn: (message?: any, ...optionalParams: any[]) => void;
  trace: (message?: any, ...optionalParams: any[]) => void;
};

// Import AsyncStorage and fetch with proper typing
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from '../../util/fetch';

const PAYNYM_API_BASE = 'https://paynym.rs/api/v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY_PREFIX = 'paynym_dir_';

/**
 * Paynym API response wrapper
 */
export interface PaynymResponse<T> {
  value: T | null;
  statusCode: number;
  message: string;
}

/**
 * Paynym account information
 * Returned by POST /api/v1/nym
 */
export interface PaynymAccount {
  codes: Array<{
    claimed: boolean;
    segwit: boolean;
    code: string;
  }>;
  followers: Array<{
    nymId: string;
  }>;
  following: Array<{
    nymId: string;
  }>;
  nymID: string;
  nymName: string;
}

/**
 * Created Paynym information
 * Returned by POST /api/v1/create
 */
export interface CreatedPaynym {
  claimed: boolean;
  nymID: string;
  nymName: string;
  segwit: boolean;
  token: string;
}

/**
 * Paynym token response
 * Returned by POST /api/v1/token
 */
export interface PaynymToken {
  token: string;
}

/**
 * Paynym claim response
 * Returned by POST /api/v1/claim
 */
export interface PaynymClaim {
  claimed: string;
  token: string;
}

/**
 * Paynym follow response
 * Returned by POST /api/v1/follow
 */
export interface PaynymFollow {
  follower: string;
  following: string;
  token: string;
}

/**
 * Paynym unfollow response
 * Returned by POST /api/v1/unfollow
 */
export interface PaynymUnfollow {
  follower: string;
  unfollowing: string;
  token: string;
}

/**
 * Paynym add code response
 * Returned by POST /api/v1/nym/add
 */
export interface PaynymAddCode {
  code: string;
  segwit: boolean;
  token: string;
}

/**
 * Minimal Paynym directory information (for backward compatibility)
 */
export interface PaynymInfo {
  code: string;
  nymID?: string;
  nymName?: string;
  avatar?: string;
  followers?: number;
  following?: number;
  createdAt?: string;
  cached_at?: number;
}

/**
 * Paynym API client based on stack_wallet implementation
 * This handles all paynym.rs API interactions with proper authentication
 */
export class PaynymDirectory {
  /**
   * Make POST request to paynym.rs API
   */
  private static async _post(
    endpoint: string,
    body: Record<string, any>,
    additionalHeaders: Record<string, string> = {},
  ): Promise<[Record<string, any>, number]> {
    // Construct URL with proper endpoint handling
    const url = `${PAYNYM_API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    // Calculate content length like Stack Wallet does
    const bodyString = JSON.stringify(body);
    const contentLength = new Blob([bodyString]).size;

    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Content-Length': contentLength.toString(),
      ...additionalHeaders,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyString,
      });

      // Handle rate limiting (429) with proper retry logic
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000; // Default 5 seconds

        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Retry once after waiting
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers,
          body: bodyString,
        });

        if (!retryResponse.ok) {
          throw new Error(
            `HTTP ${retryResponse.status}: ${retryResponse.statusText}`,
          );
        }

        const data = await retryResponse.json();
        return [data, retryResponse.status];
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return [data, response.status];
    } catch (error) {
      console.error('Paynym API request failed:', error);
      throw error;
    }
  }

  /**
   * Create a new PayNym entry in the database
   * POST /api/v1/create
   *
   * Creates a new, unclaimed PayNym entry. If the payment code already exists,
   * the existing record is returned (status 200).
   *
   * @param code - A valid BIP-47 payment code (must start with PM8T...)
   * @returns Promise containing the created PayNym information with a fresh token
   */
  static async create(code: string): Promise<PaynymResponse<CreatedPaynym>> {
    console.log('[CREATE DEBUG] ========================================');
    console.log('[CREATE DEBUG] create() called with code:', code.substring(0, 20) + '...');
    console.log('[CREATE DEBUG] Stack trace:');
    console.trace();
    console.log('[CREATE DEBUG] ========================================');
    
    try {
      const [result, statusCode] = await this._post('/create', { code });

      let message: string;
      let value: CreatedPaynym | null = null;

      switch (statusCode) {
        case 201:
          message = 'PayNym created successfully';
          value = result as CreatedPaynym;
          break;
        case 200:
          message = 'PayNym already exists';
          value = result as CreatedPaynym;
          break;
        case 400:
          message = 'Bad request: Invalid payment code format';
          break;
        default:
          message = result.message || 'Unknown error';
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get authentication token for a payment code
   * POST /api/v1/token
   *
   * @param code - The BIP-47 payment code
   * @returns Promise containing the token response
   */
  static async token(code: string): Promise<PaynymResponse<PaynymToken>> {
    try {
      const [result, statusCode] = await this._post('/token', { code });

      let message: string;
      let value: PaynymToken | null = null;

      switch (statusCode) {
        case 200:
          message = 'Token was successfully updated';
          value = result as PaynymToken;
          break;
        case 404:
          message = 'Payment code was not found in database';
          break;
        case 400:
          message = 'Bad request: Invalid payment code format';
          break;
        default:
          message = result.message || 'Unknown error';
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get Paynym account information
   * POST /api/v1/nym
   *
   * Retrieves all publicly known information about a nym, including any linked
   * payment codes and follower lists.
   *
   * @param nym - A payment code, nymID, or nymName
   * @param compact - Optional parameter to request compact response (not in official API spec, may be deprecated)
   * @returns Promise containing the nym information with codes, followers, and following lists
   */
  static async nym(
    nym: string,
    compact: boolean = false,
  ): Promise<PaynymResponse<PaynymAccount>> {
    try {
      const requestBody: Record<string, any> = { nym: nym };
      if (compact) {
        requestBody.compact = true;
      }

      const [result, statusCode] = await this._post('/nym', requestBody);

      let message: string;
      let value: PaynymAccount | null = null;

      switch (statusCode) {
        case 200:
          message = 'Nym found and returned';
          value = result as PaynymAccount;
          break;
        case 404:
          message = 'Nym not found';
          break;
        case 400:
          message = 'Bad request: Invalid nym identifier';
          break;
        default:
          message = result.message || 'Unknown error';
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Claim ownership of a payment code
   * POST /api/v1/claim (authenticated)
   *
   * Claims ownership of a payment code that is currently unclaimed. After success,
   * the code is marked as claimed and can be used for authenticated requests.
   *
   * Requires:
   * - auth-token header with current token
   * - signature of the token using the notification address private key
   *
   * @param token - Current authentication token (from /create or /token)
   * @param signature - ECDSA signature of the token using the notification address private key
   * @returns Promise containing the claimed payment code and a fresh token
   */
  static async claim(
    token: string,
    signature: string,
  ): Promise<PaynymResponse<PaynymClaim>> {
    console.log('[CLAIM DEBUG] ========================================');
    console.log('[CLAIM DEBUG] claim() called');
    console.log('[CLAIM DEBUG] Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('[CLAIM DEBUG] Signature (first 20 chars):', signature.substring(0, 20) + '...');
    console.log('[CLAIM DEBUG] Stack trace:');
    console.trace();
    console.log('[CLAIM DEBUG] ========================================');
    
    try {
      const [result, statusCode] = await this._post(
        '/claim',
        { signature },
        { 'auth-token': token },
      );

      let message: string;
      let value: PaynymClaim | null = null;

      switch (statusCode) {
        case 200:
          message = 'Payment code successfully claimed';
          value = result as PaynymClaim;
          break;
        case 400:
          message = 'Bad request: Missing signature or already claimed';
          break;
        case 401:
          message =
            'Unauthorized: Invalid token, signature, or unclaimed payment code';
          break;
        default:
          message = result.message || 'Unknown error';
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Follow another PayNym account
   * POST /api/v1/follow (authenticated)
   *
   * Starts following another nym. The target can be identified by nymID, nymName,
   * or payment code.
   *
   * Requires:
   * - auth-token header with current token
   * - signature of the token using the notification address private key
   *
   * @param token - Current authentication token
   * @param signature - ECDSA signature of the token using the notification address private key
   * @param target - NymID, nymName, or payment code of the nym to follow
   * @returns Promise containing follower/following relationship and a fresh token
   */
  static async follow(
    token: string,
    signature: string,
    target: string,
  ): Promise<PaynymResponse<PaynymFollow>> {
    try {
      const [result, statusCode] = await this._post(
        '/follow',
        { target, signature },
        { 'auth-token': token },
      );

      let message: string;
      let value: PaynymFollow | null = null;

      switch (statusCode) {
        case 200:
          message = 'Added to followers';
          value = result as PaynymFollow;
          break;
        case 404:
          message = 'Target nym not found';
          break;
        case 400:
          message = 'Bad request: Missing fields or cannot follow yourself';
          break;
        case 401:
          message =
            'Unauthorized: Invalid token, signature, or unclaimed payment code';
          break;
        default:
          message = result.message || 'Unknown error';
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unfollow another PayNym account
   * POST /api/v1/unfollow (authenticated)
   *
   * Stops following a nym. The target can be identified by nymID, nymName,
   * or payment code.
   *
   * Requires:
   * - auth-token header with current token
   * - signature of the token using the notification address private key
   *
   * @param token - Current authentication token
   * @param signature - ECDSA signature of the token using the notification address private key
   * @param target - NymID, nymName, or payment code of the nym to unfollow
   * @returns Promise containing unfollowing relationship and a fresh token
   */
  static async unfollow(
    token: string,
    signature: string,
    target: string,
  ): Promise<PaynymResponse<PaynymUnfollow>> {
    try {
      const [result, statusCode] = await this._post(
        '/unfollow',
        { target, signature },
        { 'auth-token': token },
      );

      let message: string;
      let value: PaynymUnfollow | null = null;

      switch (statusCode) {
        case 200:
          message = 'Unfollowed successfully';
          value = result as PaynymUnfollow;
          break;
        case 404:
          message = 'Target nym not found';
          break;
        case 400:
          message = 'Bad request: Not currently following this nym';
          break;
        case 401:
          message =
            'Unauthorized: Invalid token, signature, or unclaimed payment code';
          break;
        default:
          message = result.message || 'Unknown error';
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add a new payment code to an existing Nym
   * POST /api/v1/nym/add (authenticated)
   *
   * IMPORTANT: This method is currently not functional due to BlueWallet's BIP47
   * implementation generating payment codes with the segwit bit set to 0x00 (non-segwit).
   * The paynym API will return segwit: false until payment codes are generated with
   * the segwit bit flipped to 0x01.
   *
   * See: PaynymClaimScreen.tsx for detailed implementation requirements and TODO.
   *
   * @param token - Current authentication token
   * @param signature - Signature of the token using the primary code's notification address private key
   * @param nym - Identifier of the nym (nymID, nymName, or primary payment code)
   * @param code - The additional payment code to add
   * @param segwit - Indicates if the payment code supports segwit (currently always false)
   * @returns Promise containing the added code response with new token
   */
  static async add(
    token: string,
    signature: string,
    nym: string,
    code: string,
    segwit: boolean = true,
  ): Promise<PaynymResponse<PaynymAddCode>> {
    try {
      const [result, statusCode] = await this._post(
        '/nym/add',
        { nym, code, signature, segwit },
        { 'auth-token': token },
      );

      let message: string;
      let value: PaynymAddCode | null = null;

      switch (statusCode) {
        case 200:
          message = 'Code added successfully';
          value = result as PaynymAddCode;
          break;
        case 400:
          message = 'Bad request: Invalid code or duplicate';
          break;
        case 401:
          message =
            'Unauthorized: Invalid token, signature, or unclaimed primary payment code';
          break;
        case 404:
          message = 'Nym not found or primary code not claimed';
          break;
        default:
          message = result.message || 'Unknown error';
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===== BACKWARD COMPATIBILITY METHODS =====

  /**
   * Get Paynym info from directory service (backward compatibility)
   * @param paymentCode - BIP47 payment code (PM8T...)
   * @returns Promise<PaynymInfo | null>
   */
  static async getPaynymInfo(paymentCode: string): Promise<PaynymInfo | null> {
    try {
      const response = await this.nym(paymentCode, true);
      if (response.value && response.statusCode === 200) {
        const account = response.value;
        return {
          code: paymentCode,
          nymID: account.nymID,
          nymName: account.nymName,
          followers: account.followers.length,
          following: account.following.length,
          cached_at: Date.now(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching Paynym info:', error);
      return null;
    }
  }

  /**
   * Get cached Paynym info or fetch fresh
   */
  static async getPaynymInfoCached(
    paymentCode: string,
    forceRefresh: boolean = false,
  ): Promise<PaynymInfo | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.getCachedPaynymInfo(paymentCode);
      if (cached) {
        // Cache valid for 24 hours
        const cacheAge = Date.now() - cached.cached_at!;
        if (cacheAge < CACHE_DURATION) {
          return cached;
        }
      }
    }

    // Fetch fresh data
    const paynymInfo = await this.getPaynymInfo(paymentCode);
    if (paynymInfo) {
      await this.cachePaynymInfo(paymentCode, paynymInfo);
    }
    return paynymInfo;
  }

  /**
   * Get cached Paynym info
   */
  static async getCachedPaynymInfo(
    paymentCode: string,
  ): Promise<PaynymInfo | null> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${paymentCode}`;
      const cached = await AsyncStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached Paynym info:', error);
      return null;
    }
  }

  /**
   * Cache Paynym info locally
   */
  static async cachePaynymInfo(
    paymentCode: string,
    paynymInfo: PaynymInfo,
  ): Promise<void> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${paymentCode}`;
      await AsyncStorage.setItem(key, JSON.stringify(paynymInfo));
    } catch (error) {
      console.error('Error caching Paynym info:', error);
    }
  }

  /**
   * Get following list for a Paynym (backward compatibility)
   */
  static async getFollowing(paymentCode: string): Promise<PaynymInfo[]> {
    try {
      const response = await this.nym(paymentCode);
      if (response.value && response.statusCode === 200) {
        const account = response.value;
        return account.following.map((follower) => ({
          code: '', // Would need additional API calls to get full codes
          nymID: follower.nymId,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting following list:', error);
      return [];
    }
  }

  /**
   * Get followers list for a Paynym (backward compatibility)
   */
  static async getFollowers(paymentCode: string): Promise<PaynymInfo[]> {
    try {
      const response = await this.nym(paymentCode);
      if (response.value && response.statusCode === 200) {
        const account = response.value;
        return account.followers.map((follower) => ({
          code: '', // Would need additional API calls to get full codes
          nymID: follower.nymId,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting followers list:', error);
      return [];
    }
  }

  /**
   * Clear all cached Paynym data
   */
  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const paynymKeys = keys.filter((key: string) =>
        key.startsWith(STORAGE_KEY_PREFIX),
      );

      for (const key of paynymKeys) {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error clearing Paynym cache:', error);
    }
  }

  /**
   * Claim a Paynym (register with directory) - backward compatibility
   * @param paymentCode - BIP47 payment code
   * @param signature - Signed message for verification
   */
  static async claimPaynym(
    paymentCode: string,
    signature: string,
  ): Promise<any> {
    try {
      // First get a token
      const tokenResponse = await this.token(paymentCode);
      if (!tokenResponse.value) {
        throw new Error(`Failed to get token: ${tokenResponse.message}`);
      }

      // Then claim with the token and signature
      const claimResponse = await this.claim(
        tokenResponse.value.token,
        signature,
      );
      if (!claimResponse.value) {
        throw new Error(`Failed to claim: ${claimResponse.message}`);
      }

      return claimResponse.value;
    } catch (error) {
      console.error('Error claiming Paynym:', error);
      throw error;
    }
  }

  /**
   * Get authentication token for a payment code (backward compatibility)
   * @param paymentCode - BIP47 payment code
   * @returns The token string or null if failed
   */
  static async getToken(paymentCode: string): Promise<string | null> {
    try {
      const response = await this.token(paymentCode);
      return response.value?.token || null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
}

export default PaynymDirectory;
