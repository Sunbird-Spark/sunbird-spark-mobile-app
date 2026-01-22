import { socialLoginService } from '../services/auth/socialLogin/socialLogin.service';
import { NativeGoogleSessionProvider } from '../services/auth/socialLogin/googleSessionProvider';
import { loginNavigationHandlerService } from '../services/auth/loginNavigationHandler.service';

export function useGoogleSignin() {
  const signInWithGoogle = async (skipNavigation?: any) => {
    // 1) Initialize Google login with client ID from API
    await socialLoginService.initGoogle();

    // 2) Google login (native UI)
    const result = await socialLoginService.loginWithGoogle();

    // 3) Convert result → session provider
    const nativeGoogleProvider = new NativeGoogleSessionProvider(() => result);

    // 4) Complete Sunbird backend login
    await loginNavigationHandlerService.setSession(nativeGoogleProvider, skipNavigation, 'GOOGLE');
  };

  return { signInWithGoogle };
}
