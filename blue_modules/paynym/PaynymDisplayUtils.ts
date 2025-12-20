// Type declarations for global objects
declare const console: {
  log: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
};

import { PaynymInfo } from './PaynymDirectory';

/**
 * Utility functions for displaying Paynym information
 * This handles the +botname formatting and display helpers
 */
export class PaynymDisplayUtils {
  /**
   * Check if a payment code is valid (basic validation)
   * @param paymentCode - BIP47 payment code
   * @returns boolean
   */
  static isValidPaymentCode(paymentCode: string): boolean {
    // Basic PM8T format validation
    const pm8tRegex = /^PM8T[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    if (!pm8tRegex.test(paymentCode)) {
      return false;
    }
    
    // Length check (payment codes are typically 100+ chars)
    return paymentCode.length >= 50;
  }

  /**
   * Format payment code as +nymId (human readable format)
   * @param paymentCode - BIP47 payment code
   * @param paynymInfo - Optional Paynym directory info
   * @returns Formatted display string
   */
  static formatPaymentCode(paymentCode: string, paynymInfo?: PaynymInfo): string {
    // If we have Paynym info, use the nymName
    if (paynymInfo?.nymName) {
      return `+${paynymInfo.nymName}`;
    }
    
    // Fallback to truncated payment code with + prefix
    if (paymentCode.startsWith('PM8T') && paymentCode.length > 20) {
      const truncated = paymentCode.substring(0, 20);
      return `+${truncated}...`;
    }
    
    // Last resort - just show the payment code
    return paymentCode;
  }

  /**
   * Get avatar URL for a Paynym
   * @param paynymInfo - Paynym directory info
   * @returns Avatar URL or null
   */
  static getAvatarUrl(paynymInfo?: PaynymInfo | null): string | null {
    if (!paynymInfo?.avatar) {
      return null;
    }
    
    // If it's already a full URL, return as-is
    if (paynymInfo.avatar.startsWith('http')) {
      return paynymInfo.avatar;
    }
    
    // Otherwise, construct paynym.rs avatar URL
    if (paynymInfo.nymID) {
      return `https://paynym.rs/avatar/${paynymInfo.nymID}.svg`;
    }
    
    return null;
  }

  /**
   * Get display name for a Paynym
   * @param paynymInfo - Paynym directory info
   * @returns Display name or formatted payment code
   */
  static getDisplayName(paynymInfo?: PaynymInfo, paymentCode?: string): string {
    if (!paynymInfo) {
      return paymentCode || 'Unknown';
    }
    
    return paynymInfo.nymName || paymentCode || 'Unknown';
  }

  /**
   * Format followers count for display
   * @param followers - Number of followers
   * @returns Formatted string
   */
  static formatFollowersCount(followers?: number): string {
    if (!followers || followers === 0) {
      return 'No followers';
    }
    
    if (followers === 1) {
      return '1 follower';
    }
    
    return `${followers} followers`;
  }

  /**
   * Format following count for display
   * @param following - Number of following
   * @returns Formatted string
   */
  static formatFollowingCount(following?: number): string {
    if (!following || following === 0) {
      return 'Not following anyone';
    }
    
    if (following === 1) {
      return 'Following 1';
    }
    
    return `Following ${following}`;
  }

  /**
   * Check if two Paynyms are the same
   * @param a - First Paynym info
   * @param b - Second Paynym info
   * @returns boolean
   */
  static isSamePaynym(a: PaynymInfo | null, b: PaynymInfo | null): boolean {
    if (!a || !b) {
      return false;
    }
    
    return a.code === b.code;
  }

  /**
   * Get a short display version of payment code
   * @param paymentCode - BIP47 payment code
   * @returns Shortened version
   */
  static getShortPaymentCode(paymentCode: string): string {
    if (paymentCode.startsWith('PM8T') && paymentCode.length > 15) {
      return `${paymentCode.substring(0, 15)}...`;
    }
    
    return paymentCode;
  }

  /**
   * Create a display summary for a Paynym
   * @param paynymInfo - Paynym directory info
   * @returns Formatted summary string
   */
  static getPaynymSummary(paynymInfo?: PaynymInfo): string {
    if (!paynymInfo) {
      return 'Unclaimed Paynym';
    }
    
    const name = this.getDisplayName(paynymInfo);
    const followers = this.formatFollowersCount(paynymInfo.followers);
    const following = this.formatFollowingCount(paynymInfo.following);
    
    return `${name} • ${followers} • ${following}`;
  }

  /**
   * Get connection status text
   * @param isConnected - Whether BIP47 notification has been sent
   * @returns Status text
   */
  static getConnectionStatus(isConnected: boolean): string {
    return isConnected ? 'Connected' : 'Not connected';
  }

  /**
   * Sort Paynyms by display name
   * @param paynyms - Array of Paynym info
   * @returns Sorted array
   */
  static sortByName(paynyms: PaynymInfo[]): PaynymInfo[] {
    return paynyms.sort((a, b) => {
      const nameA = a.nymName || a.code;
      const nameB = b.nymName || b.code;
      
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    });
  }

  /**
   * Create a search suggestion from payment code
   * @param paymentCode - BIP47 payment code
   * @returns Search suggestion object
   */
  static createSearchSuggestion(paymentCode: string): {
    paymentCode: string;
    displayText: string;
    shortCode: string;
  } {
    return {
      paymentCode,
      displayText: this.formatPaymentCode(paymentCode),
      shortCode: this.getShortPaymentCode(paymentCode),
    };
  }
}

export default PaynymDisplayUtils;
