# Google Sign-In Service Layer

## Overview

This is a **base service layer** for Google Sign-In using Capacitor Social Login. It's a simple wrapper around Capacitor methods with no additional abstractions.

## Service API

### Initialize

```typescript
import { socialLoginService } from './services/auth/socialLogin/socialLogin.service';

// Initialize with your Google Web Client ID
await socialLoginService.initGoogle('YOUR_CLIENT_ID.apps.googleusercontent.com');
```

### Login

```typescript
// Show native Google Sign-In UI
const result = await socialLoginService.loginWithGoogle();

console.log('User email:', result.email);
console.log('ID Token:', result.idToken);
console.log('Access Token:', result.accessToken);
```

### Silent Login

```typescript
// Try to sign in without showing UI (if user previously logged in)
const result = await socialLoginService.trySilentGoogleLogin();

if (result) {
  console.log('Auto signed in:', result.email);
} else {
  console.log('Silent login failed, show login button');
}
```

### Logout

```typescript
// Sign out from Google
await socialLoginService.logoutGoogle();
```

## Complete Example

```typescript
import { socialLoginService } from './services/auth/socialLogin/socialLogin.service';

async function handleGoogleLogin() {
  try {
    // Step 1: Initialize
    await socialLoginService.initGoogle('YOUR_CLIENT_ID.apps.googleusercontent.com');
    
    // Step 2: Login
    const result = await socialLoginService.loginWithGoogle();
    
    // Step 3: Handle the result
    console.log('Login successful!');
    console.log('Email:', result.email);
    console.log('Name:', result.displayName);
    console.log('ID Token:', result.idToken);
    
    // TODO: Send result.idToken to your backend for verification
    // await yourBackendAPI.authenticate(result.idToken);
    
  } catch (error) {
    console.error('Login failed:', error);
  }
}

async function handleGoogleLogout() {
  try {
    await socialLoginService.logoutGoogle();
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

## Response Structure

```typescript
type GoogleLoginResult = {
  accessToken?: string;        // Google access token
  idToken?: string;            // JWT ID token (use this for backend verification)
  email?: string;              // User's email
  displayName?: string;        // User's full name
  familyName?: string;         // Last name
  givenName?: string;          // First name
  imageUrl?: string;           // Profile picture URL
  userId?: string;             // Google user ID
  serverAuthCode?: string;     // Server auth code (offline mode)
};
```

## Getting Your Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Sign-In API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **Web application** as the application type
6. Copy the **Client ID** (format: `xxxxx.apps.googleusercontent.com`)

## Error Handling

```typescript
try {
  await socialLoginService.initGoogle('YOUR_CLIENT_ID');
  const result = await socialLoginService.loginWithGoogle();
  // Handle success
} catch (error) {
  if (error.message.includes('cancelled')) {
    console.log('User cancelled login');
  } else if (error.message.includes('network')) {
    console.log('Network error');
  } else {
    console.log('Login failed:', error);
  }
}
```

Common errors:
- **User cancellation** - User closes the sign-in dialog
- **Network error** - No internet connection
- **Invalid client ID** - Wrong or missing client ID
- **Not initialized** - Called login before initialization

## Silent Login Pattern

```typescript
async function autoSignIn() {
  try {
    // Initialize first
    await socialLoginService.initGoogle('YOUR_CLIENT_ID');
    
    // Try silent login
    const result = await socialLoginService.trySilentGoogleLogin();
    
    if (result) {
      // User is already signed in
      console.log('Welcome back,', result.displayName);
      return result;
    } else {
      // Show login button
      console.log('Please sign in');
      return null;
    }
  } catch (error) {
    console.error('Auto sign-in failed:', error);
    return null;
  }
}
```

## Testing

```bash
# Run tests
npm test -- src/services/auth/socialLogin/socialLogin.service.test.ts --run

# All 22 tests should pass ✓
```

## Testing on Device

```bash
# Build for Android
npm run build
npx cap sync android
npx cap open android

# Build for iOS
npm run build
npx cap sync ios
npx cap open ios
```

Note: Google Sign-In works best on actual devices or emulators, not in the browser.

## What's Included

✅ Service layer with Capacitor wrapper
✅ Initialization with client ID
✅ Native Google Sign-In UI
✅ Silent login capability
✅ Logout functionality
✅ Online/offline mode support
✅ Comprehensive test coverage (22 tests)

## What's NOT Included (Future)

These will be added later:

- ❌ React hooks for component integration
- ❌ Backend API integration
- ❌ System settings service (dynamic client ID)
- ❌ Session management
- ❌ Profile refresh
- ❌ Navigation handling

For now, you get the raw service layer. Integration layers can be added when needed!
