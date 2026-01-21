import type { GoogleLoginResult } from './socialLogin.service';

// This is equivalent to: NativeGoogleSessionProvider(() => result)
export class NativeGoogleSessionProvider {
  constructor(private getResult: () => Promise<GoogleLoginResult> | GoogleLoginResult) {}

  async provide() {
    const res = await this.getResult();

    // Return shape expected by authService.setSession(...)
    return {
      idToken: res.idToken,
      accessToken: res.accessToken,
      serverAuthCode: res.serverAuthCode,
      email: res.email,
      userId: res.userId,
    };
  }
}
