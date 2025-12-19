// Type declarations for global objects
declare const console: {
  log: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
};

// Import AsyncStorage and fetch with proper typing
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from '../../util/fetch';

const PAYNYM_API_BASE = 'https://paynym.rs/api';
const API_VERSION = '/v1';
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
 */
export interface CreatedPaynym {
  claimed: boolean;
  nymID: string;
  nymName: string;
  segwit: boolean;
  token: string;
}

/**
 * Paynym claim response
 */
export interface PaynymClaim {
  claimed: string;
  token: string;
}

/**
 * Paynym follow response
 */
export interface PaynymFollow {
  follower: string;
  following: string;
  token: string;
}

/**
 * Paynym unfollow response
 */
export interface PaynymUnfollow {
  follower: string;
  unfollowing: string;
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
    additionalHeaders: Record<string, string> = {}
  ): Promise<[Record<string, any>, number]> {
    const url = `${PAYNYM_API_BASE}/api${API_VERSION}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      ...additionalHeaders
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

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
   */
  static async create(code: string): Promise<PaynymResponse<CreatedPaynym>> {
    try {
      const [result, statusCode] = await this._post('/create', { code });

      let message: string;
      let value: CreatedPaynym | null = null;

      switch (statusCode) {
        case 201:
          message = "PayNym created successfully";
          value = result as CreatedPaynym;
          break;
        case 200:
          message = "PayNym already exists";
          value = result as CreatedPaynym;
          break;
        case 400:
          message = "Bad request";
          break;
        default:
          message = result.message || "Unknown error";
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get authentication token for a payment code
   * POST /api/v1/token
   */
  static async token(code: string): Promise<PaynymResponse<string>> {
    try {
      const [result, statusCode] = await this._post('/token', { code });

      let message: string;
      let value: string | null = null;

      switch (statusCode) {
        case 200:
          message = "Token was successfully updated";
          value = result.token as string;
          break;
        case 404:
          message = "Payment code was not found";
          break;
        case 400:
          message = "Bad request";
          break;
        default:
          message = result.message || "Unknown error";
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get Paynym account information
   * POST /api/v1/nym
   */
  static async nym(code: string, compact: boolean = false): Promise<PaynymResponse<PaynymAccount>> {
    try {
      const requestBody: Record<string, any> = { nym: code };
      if (compact) {
        requestBody.compact = true;
      }

      const [result, statusCode] = await this._post('/nym', requestBody);

      let message: string;
      let value: PaynymAccount | null = null;

      switch (statusCode) {
        case 200:
          message = "Nym found and returned";
          value = result as PaynymAccount;
          break;
        case 404:
          message = "Nym not found";
          break;
        case 400:
          message = "Bad request";
          break;
        default:
          message = result.message || "Unknown error";
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Claim ownership of a payment code
   * POST /api/v1/claim (authenticated)
   */
  static async claim(token: string, signature: string): Promise<PaynymResponse<PaynymClaim>> {
    try {
      const [result, statusCode] = await this._post(
        '/claim',
        { signature },
        { 'auth-token': token }
      );

      let message: string;
      let value: PaynymClaim | null = null;

      switch (statusCode) {
        case 200:
          message = "Payment code successfully claimed";
          value = result as PaynymClaim;
          break;
        case 400:
          message = "Bad request";
          break;
        default:
          message = result.message || "Unknown error";
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Follow another PayNym account
   * POST /api/v1/follow (authenticated)
   */
  static async follow(token: string, signature: string, target: string): Promise<PaynymResponse<PaynymFollow>> {
    try {
      const [result, statusCode] = await this._post(
        '/follow',
        { target, signature },
        { 'auth-token': token }
      );

      let message: string;
      let value: PaynymFollow | null = null;

      switch (statusCode) {
        case 200:
          message = "Added to followers";
          value = result as PaynymFollow;
          break;
        case 404:
          message = "Payment code not found";
          break;
        case 400:
          message = "Bad request";
          break;
        case 401:
          message = "Unauthorized token or signature or Unclaimed payment code";
          break;
        default:
          message = result.message || "Unknown error";
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Unfollow another PayNym account
   * POST /api/v1/unfollow (authenticated)
   */
  static async unfollow(token: string, signature: string, target: string): Promise<PaynymResponse<PaynymUnfollow>> {
    try {
      const [result, statusCode] = await this._post(
        '/unfollow',
        { target, signature },
        { 'auth-token': token }
      );

      let message: string;
      let value: PaynymUnfollow | null = null;

      switch (statusCode) {
        case 200:
          message = "Unfollowed successfully";
          value = result as PaynymUnfollow;
          break;
        case 404:
          message = "Payment code not found";
          break;
        case 400:
          message = "Bad request";
          break;
        case 401:
          message = "Unauthorized token or signature or Unclaimed payment code";
          break;
        default:
          message = result.message || "Unknown error";
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: null,
        statusCode: -1,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Add a new payment code to an existing Nym
   * POST /api/v1/nym/add (authenticated)
   */
  static async add(token: string, signature: string, nym: string, code: string): Promise<PaynymResponse<boolean>> {
    try {
      const [result, statusCode] = await this._post(
        '/nym/add',
        { nym, code, signature },
        { 'auth-token': token }
      );

      let message: string;
      let value = false;

      switch (statusCode) {
        case 200:
          message = "Code added successfully";
          value = true;
          break;
        case 400:
          message = "Bad request";
          break;
        case 401:
          message = "Unauthorized token or signature or Unclaimed payment code";
          break;
        case 404:
          message = "Nym not found";
          break;
        default:
          message = result.message || "Unknown error";
      }

      return { value, statusCode, message };
    } catch (error) {
      return {
        value: false,
        statusCode: -1,
        message: error instanceof Error ? error.message : "Unknown error"
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
  static async getPaynymInfoCached(paymentCode: string, forceRefresh: boolean = false): Promise<PaynymInfo | null> {
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
  static async getCachedPaynymInfo(paymentCode: string): Promise<PaynymInfo | null> {
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
  static async cachePaynymInfo(paymentCode: string, paynymInfo: PaynymInfo): Promise<void> {
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
        return account.following.map(follower => ({
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
        return account.followers.map(follower => ({
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
      const paynymKeys = keys.filter((key: string) => key.startsWith(STORAGE_KEY_PREFIX));
      
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
  static async claimPaynym(paymentCode: string, signature: string): Promise<any> {
    try {
      // First get a token
      const tokenResponse = await this.token(paymentCode);
      if (!tokenResponse.value) {
        throw new Error(`Failed to get token: ${tokenResponse.message}`);
      }

      // Then claim with the token and signature
      const claimResponse = await this.claim(tokenResponse.value, signature);
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
   */
  static async getToken(paymentCode: string): Promise<string | null> {
    try {
      const response = await this.token(paymentCode);
      return response.value;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
}

export default PaynymDirectory;
