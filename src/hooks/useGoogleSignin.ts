import { socialLoginService } from '../services/auth/socialLogin/socialLogin.service';
import { NativeGoogleSessionProvider } from '../services/auth/socialLogin/googleSessionProvider';
import { loginNavigationHandlerService } from '../services/auth/loginNavigationHandler.service';

export function useGoogleSignIn() {
  const signInWithGoogle = async (skipNavigation?: any) => {
    // 1) Google login (native UI)
    const result = await socialLoginService.loginWithGoogle();

    // 2) Convert result → session provider
    const nativeGoogleProvider = new NativeGoogleSessionProvider(() => result);

    // 3) Complete Sunbird backend login
    await loginNavigationHandlerService.setSession(nativeGoogleProvider, skipNavigation, 'GOOGLE');
  };

  return { signInWithGoogle };
}
