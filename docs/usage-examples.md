# How to Use the Google Sign-In Hook

## Basic Usage

The `useGoogleSignin` hook provides a simple way to add Google Sign-In to any component.

### Example 1: Simple Button

```typescript
import { IonButton } from '@ionic/react';
import { useGoogleSignin } from '../hooks/useGoogleSignin';

function MyComponent() {
  const { signInWithGoogle } = useGoogleSignin();

  return (
    <IonButton onClick={() => signInWithGoogle()}>
      Sign in with Google
    </IonButton>
  );
}
```

### Example 2: With Loading State

```typescript
import { useState } from 'react';
import { IonButton, IonSpinner } from '@ionic/react';
import { useGoogleSignin } from '../hooks/useGoogleSignin';

function MyComponent() {
  const { signInWithGoogle } = useGoogleSignin();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      // Success! User is now signed in
    } catch (error) {
      console.error('Sign-in failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonButton onClick={handleSignIn} disabled={isLoading}>
      {isLoading ? <IonSpinner /> : 'Sign in with Google'}
    </IonButton>
  );
}
```

### Example 3: With Error Handling

```typescript
import { useState } from 'react';
import { IonButton, IonText } from '@ionic/react';
import { useGoogleSignin } from '../hooks/useGoogleSignin';

function MyComponent() {
  const { signInWithGoogle } = useGoogleSignin();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  };

  return (
    <div>
      {error && <IonText color="danger">{error}</IonText>}
      <IonButton onClick={handleSignIn}>
        Sign in with Google
      </IonButton>
    </div>
  );
}
```

### Example 4: With Navigation

```typescript
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonButton } from '@ionic/react';
import { useGoogleSignin } from '../hooks/useGoogleSignin';

function LoginPage() {
  const history = useHistory();
  const { signInWithGoogle } = useGoogleSignin();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      
      // Navigate to home after successful sign-in
      history.push('/home');
    } catch (error) {
      console.error('Sign-in failed:', error);
      // Stay on login page
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonButton onClick={handleSignIn} disabled={isLoading}>
      Sign in with Google
    </IonButton>
  );
}
```

### Example 5: Complete Login Page

See `src/pages/Login.tsx` for a full example with:
- Loading state
- Error handling
- Navigation after success
- Proper UI/UX

## What Happens When You Call `signInWithGoogle()`?

1. **Fetches Google Client ID** from Sunbird API
   - Calls: `GET /api/data/v1/system/settings/get/googleClientId`
   
2. **Initializes Google Sign-In** with the fetched client ID
   - Uses `@capgo/capacitor-social-login` plugin
   
3. **Shows Google native sign-in UI**
   - User selects Google account
   - User grants permissions
   
4. **Returns user data**
   - idToken, accessToken, email, profile info
   
5. **Creates session with Sunbird backend**
   - Calls your backend authentication endpoint
   - Stores session token

## Adding to Existing Components

### Add to Home Page

```typescript
// src/pages/Home.tsx
import { useGoogleSignin } from '../hooks/useGoogleSignin';

const Home: React.FC = () => {
  const { signInWithGoogle } = useGoogleSignin();

  return (
    <IonPage>
      {/* ... existing code ... */}
      <IonButton onClick={() => signInWithGoogle()}>
        Sign in with Google
      </IonButton>
    </IonPage>
  );
};
```

### Add to Profile Page

```typescript
// src/pages/Profile.tsx
import { useGoogleSignin } from '../hooks/useGoogleSignin';

const Profile: React.FC = () => {
  const { signInWithGoogle } = useGoogleSignin();

  return (
    <IonPage>
      {/* ... existing code ... */}
      <IonButton onClick={() => signInWithGoogle()}>
        Link Google Account
      </IonButton>
    </IonPage>
  );
};
```

## Advanced: Skip Navigation

If you want to handle navigation yourself:

```typescript
const { signInWithGoogle } = useGoogleSignin();

// Pass skipNavigation parameter
await signInWithGoogle({ skipNavigation: true });

// Handle your own navigation
history.push('/custom-page');
```

## Error Scenarios

The hook may throw errors in these cases:

1. **Network error** - Can't reach API
2. **API error** - System settings not found
3. **User cancellation** - User closes Google sign-in dialog
4. **Permission denied** - User denies Google permissions
5. **Backend error** - Session creation fails

Always wrap in try-catch to handle these gracefully!

## Testing

You can test the sign-in flow:

```bash
# Run the app
npm run dev

# Or build for Android
npm run build
npx cap sync android
npx cap open android
```

Make sure your backend API is accessible from the device/emulator.
