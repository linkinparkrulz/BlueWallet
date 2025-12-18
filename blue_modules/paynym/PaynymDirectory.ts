// Type declarations for global objects
declare const console: {
  log: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
};

// Import AsyncStorage and fetch with proper typing
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch } from '../../util/fetch';

const PAYNYM_API_BASE = 'https://paynym.rs/api/v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY_PREFIX = 'paynym_dir_';

/**
 * Minimal Paynym directory information
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
 * Simple Paynym directory service
 * This is just a phonebook for BIP47 payment codes
 */
export class PaynymDirectory {
  /**
   * Get Paynym info from directory service
   * @param paymentCode - BIP47 payment code (PM8T...)
   * @returns Promise<PaynymInfo | null>
   */
  static async getPaynymInfo(paymentCode: string): Promise<PaynymInfo | null> {
    try {
      const response = await fetch(`${PAYNYM_API_BASE}/${paymentCode}`);
      if (response.status === 404) {
        return null; // Not claimed
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return {
        ...data,
        cached_at: Date.now(),
      };
    } catch (error) {
      console.error('Error fetching Paynym info:', error);
      throw error;
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
   * Get following list for a Paynym
   */
  static async getFollowing(paymentCode: string): Promise<PaynymInfo[]> {
    try {
      const response = await fetch(`${PAYNYM_API_BASE}/${paymentCode}/following`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error getting following list:', error);
      return [];
    }
  }

  /**
   * Get followers list for a Paynym
   */
  static async getFollowers(paymentCode: string): Promise<PaynymInfo[]> {
    try {
      const response = await fetch(`${PAYNYM_API_BASE}/${paymentCode}/followers`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.value || [];
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
   * Claim a Paynym (register with directory)
   * @param paymentCode - BIP47 payment code
   * @param signature - Signed message for verification
   */
  static async claimPaynym(paymentCode: string, signature: string): Promise<any> {
    try {
      const response = await fetch(`${PAYNYM_API_BASE}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: paymentCode,
          signature: signature,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error claiming Paynym:', error);
      throw error;
    }
  }

  /**
   * Get authentication token for a payment code
   */
  static async getToken(paymentCode: string): Promise<string | null> {
    try {
      const response = await fetch(`${PAYNYM_API_BASE}/token/${paymentCode}`);
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.value || null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
}

export default PaynymDirectory;
