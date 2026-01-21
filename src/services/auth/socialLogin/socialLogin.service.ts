import { SocialLogin } from '@capgo/capacitor-social-login';

export type GoogleLoginResult = {
  accessToken?: string;
  idToken?: string;
  email?: string;
  displayName?: string;
  familyName?: string;
  givenName?: string;
  imageUrl?: string;
  userId?: string;
  serverAuthCode?: string;
};

class SocialLoginService {
  private initialized = false;

  async initGoogle(webClientId: string) {
    if (this.initialized) return;

    await SocialLogin.initialize({
      google: {
        webClientId,
      },
    });

    this.initialized = true;
  }

  async loginWithGoogle(): Promise<GoogleLoginResult> {
    const res = await SocialLogin.login({ provider: 'google' });

    return {
      accessToken: res.accessToken,
      idToken: res.idToken,
      email: res.email,
      userId: res.userId,
      serverAuthCode: (res as any).serverAuthCode,
    };
  }

  async trySilentGoogleLogin(): Promise<GoogleLoginResult> {
    const res = await SocialLogin.login({
      provider: 'google',
      options: { silent: true },
    });

    return {
      accessToken: res.accessToken,
      idToken: res.idToken,
      email: res.email,
      userId: res.userId,
      serverAuthCode: (res as any).serverAuthCode,
    };
  }

  async logoutGoogle() {
    await SocialLogin.logout({ provider: 'google' });
  }
}

export const socialLoginService = new SocialLoginService();
