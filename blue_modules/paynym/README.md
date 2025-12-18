# BlueWallet Paynym Integration

## Overview

This is the **corrected** Paynym implementation for BlueWallet that properly leverages the existing BIP47 infrastructure instead of creating parallel systems.

## Key Design Principles

1. **Payment Codes ARE Paynym Codes** - PM8T... format is both BIP47 payment code and Paynym identifier
2. **Leverage Existing BIP47** - BlueWallet already has full BIP47 support (notification transactions, address generation, etc.)
3. **Minimal Directory Layer** - Paynym.rs is just a phonebook for human-readable names and avatars
4. **Extend Existing Classes** - Don't create new wallet classes, extend existing ones

## Architecture

### Core Components

1. **PaynymDirectory.ts** - Simple API wrapper for paynym.rs directory service
   - Fetch Paynym info (names, avatars, social graph)
   - Cache results locally for 24 hours
   - Handle following/followers lists

2. **PaynymDisplayUtils.ts** - Display formatting and validation utilities
   - Format payment codes as +botname
   - Validate PM8T format
   - Avatar URL generation
   - Search and sorting helpers

3. **Extended HDSegwitBech32Wallet** - Main wallet class with Paynym methods
   - Uses existing BIP47 methods under the hood
   - Adds Paynym-specific display and directory integration
   - Maintains full compatibility with existing code

### File Structure
```
blue_modules/paynym/
├── PaynymDirectory.ts      # Directory API wrapper
├── PaynymDisplayUtils.ts   # Display utilities
├── PaynymIntegrationTest.ts # Test suite
└── README.md               # This documentation
```

## Key Methods Added

### HDSegwitBech32Wallet Extensions
```typescript
// Get wallet's own Paynym info
await wallet.getMyPaynymInfo()

// Display wallet's Paynym name
wallet.getMyPaynymDisplay()

// Check if wallet's Paynym is claimed
await wallet.isMyPaynymClaimed()

// Get Paynym info for any payment code
await wallet.getPaynymInfo(paymentCode)

// Check if connected to another Paynym
wallet.isConnectedToPaynym(paymentCode)

// Get following/followers
await wallet.getPaynymFollowing(paymentCode)
await wallet.getPaynymFollowers(paymentCode)

// Get avatar URL
await wallet.getPaynymAvatar(paymentCode)

// Get all connected Paynyms with display info
await wallet.getConnectedPaynyms()

// Search Paynyms
await wallet.searchPaynyms(query)
```

### Directory Methods
```typescript
// Fetch from paynym.rs API
await PaynymDirectory.getPaynymInfo(paymentCode)

// Get with caching
await PaynymDirectory.getPaynymInfoCached(paymentCode)

// Get following/followers
await PaynymDirectory.getFollowing(paymentCode)
await PaynymDirectory.getFollowers(paymentCode)

// Claim a Paynym
await PaynymDirectory.claimPaynym(paymentCode, signature)
```

### Display Utilities
```typescript
// Format as +botname
PaynymDisplayUtils.formatPaymentCode(paymentCode, paynymInfo)

// Validate payment code format
PaynymDisplayUtils.isValidPaymentCode(paymentCode)

// Get avatar URL
PaynymDisplayUtils.getAvatarUrl(paynymInfo)

// Get display name
PaynymDisplayUtils.getDisplayName(paynymInfo, paymentCode)
```

## Integration Points

### Existing BIP47 Methods Used
- `getBIP47PaymentCode()` - Gets wallet's payment code
- `isBIP47Enabled()` - Checks if BIP47 is enabled
- `getBIP47SenderPaymentCodes()` - Get payment codes we can pay
- `getBIP47ReceiverPaymentCodes()` - Get payment codes that can pay us
- `getBIP47NotificationTransaction()` - Check if notification sent
- `createBip47NotificationTransaction()` - Create connection tx

### New Paynym-Specific Methods
- All Paynym methods check `allowBIP47()` and `isBIP47Enabled()`
- Graceful fallback when BIP47 is disabled
- Proper error handling for invalid payment codes

## Testing

Run the test suite:
```typescript
import PaynymIntegrationTest from './PaynymIntegrationTest';

const results = await PaynymIntegrationTest.runAllTests();
console.log('Test results:', results);
```

## Benefits of This Approach

1. **No Code Duplication** - Reuses existing, battle-tested BIP47 implementation
2. **Minimal Dependencies** - Only adds paynym.rs API layer
3. **Backward Compatible** - Doesn't break existing wallet functionality
4. **Clean Architecture** - Clear separation of concerns
5. **Easy Testing** - Can test components independently
6. **Future-Proof** - Can easily extend with new Paynym features

## Comparison to Original Plan

| Original Plan | Corrected Implementation |
|-------------|----------------------|
| Create new PaynymWallet class | Extend existing HDSegwitBech32Wallet |
| Duplicate BIP47 functionality | Use existing BIP47 methods |
| Complex transaction handling | Leverage existing notification tx creation |
| Separate caching layer | Simple directory caching |
| Parallel systems | Integrated approach |

## Usage Examples

### Display Paynym Instead of Payment Code
```typescript
const wallet = getWallet();
const display = wallet.getMyPaynymDisplay(); // "+mybot" instead of "PM8T..."
```

### Check if Connected
```typescript
const paymentCode = 'PM8TJhgJ6pEQUHFqee72AbRUXtK1Vjf4fH3iU6f3KGagVJ6rBvZd6e4j';
if (wallet.isConnectedToPaynym(paymentCode)) {
  console.log('Already connected - can send privately');
} else {
  console.log('Need to send notification transaction first');
}
```

### Get Avatar
```typescript
const avatarUrl = await wallet.getPaynymAvatar(paymentCode);
// Returns: "https://paynym.rs/avatar/botname.svg" or null
```

This implementation provides clean Paynym integration while maintaining full compatibility with BlueWallet's existing BIP47 infrastructure.
