import {
  SocialLogin,
  type GoogleLoginResponse,
  type GoogleLoginResponseOnline,
  type GoogleLoginResponseOffline,
} from '@capgo/capacitor-social-login';
import { systemSettingsService, SystemSettingsIds } from '../../systemSettings/systemSettings.service';

// Extended type that includes serverAuthCode from the library's response
interface GoogleLoginResponseExtended extends GoogleLoginResponseOnline {
  serverAuthCode?: string;
}

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
  private initializationPromise: Promise<void> | null = null;

  async initGoogle(webClientId?: string) {
    if (this.initialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Fetch client ID from API if not provided
        let clientId = webClientId;
        if (!clientId) {
          const setting = await systemSettingsService.getSystemSettings({
            id: SystemSettingsIds.GOOGLE_CLIENT_ID,
          });
          clientId = setting.value;
        }

        await SocialLogin.initialize({
          google: {
            webClientId: clientId,
          },
        });
        this.initialized = true;
      } catch (e) {
        // if init fails, allow retry next time
        this.initializationPromise = null;
        this.initialized = false;
        throw e;
      }
    })();

    return this.initializationPromise;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      throw new Error(
        'SocialLoginService not initialized. Call initGoogle(webClientId) before login.'
      );
    }
  }

  private mapGoogleResponse(
    response: GoogleLoginResponse
  ): GoogleLoginResult {
    // Handle offline mode response
    if (response.responseType === 'offline') {
      const offlineResponse = response as GoogleLoginResponseOffline;
      return {
        serverAuthCode: offlineResponse.serverAuthCode,
      };
    }

    // Handle online mode response
    const onlineResponse = response as GoogleLoginResponseExtended;
    return {
      accessToken: onlineResponse.accessToken?.token,
      idToken: onlineResponse.idToken ?? undefined,
      email: onlineResponse.profile.email ?? undefined,
      displayName: onlineResponse.profile.name ?? undefined,
      familyName: onlineResponse.profile.familyName ?? undefined,
      givenName: onlineResponse.profile.givenName ?? undefined,
      imageUrl: onlineResponse.profile.imageUrl ?? undefined,
      userId: onlineResponse.profile.id ?? undefined,
      serverAuthCode: onlineResponse.serverAuthCode,
    };
  }

  async loginWithGoogle(): Promise<GoogleLoginResult> {
    await this.ensureInitialized();

    const res = await SocialLogin.login({ provider: 'google', options: {} });
    return this.mapGoogleResponse(res.result);
  }

  async trySilentGoogleLogin(): Promise<GoogleLoginResult | null> {
    await this.ensureInitialized();

    try {
      const res = await SocialLogin.login({
        provider: 'google',
        options: {},
      });

      return this.mapGoogleResponse(res.result);
    } catch {
      return null;
    }
  }

  async logoutGoogle() {
    await this.ensureInitialized();
    await SocialLogin.logout({ provider: 'google' });
  }
}

export const socialLoginService = new SocialLoginService();
