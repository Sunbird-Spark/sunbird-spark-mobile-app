import { InAppBrowser } from '@capacitor/inappbrowser';
import { FormService } from './FormService';

interface AuthTarget {
  host: string;
  path: string;
  params: Array<{ key: string; value: string }>;
}

interface AuthFieldConfig {
  context: string;
  target: AuthTarget;
}

class AuthWebviewService {
  private formService = new FormService();

  /**
   * Fetches auth config for the given context from Form API.
   */
  async getAuthConfig(context: string): Promise<AuthFieldConfig> {
    const response = await this.formService.formRead({
      type: 'config',
      subType: 'login_v2',
      action: 'get',
    });

    const fields = response.data?.form?.data?.fields;
    if (!fields || !Array.isArray(fields)) {
      throw new Error('Form API returned no fields');
    }

    const config = fields.find((f: AuthFieldConfig) => f.context === context);
    if (!config) {
      throw new Error(`Form config not found for context: ${context}`);
    }

    return config;
  }

  /**
   * Builds a full URL from the target config (host + path + query params).
   */
  buildUrl(target: AuthTarget): string {
    const params = target.params
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    return `${target.host}${target.path}${params ? `?${params}` : ''}`;
  }

  /**
   * Extracts the redirect_uri from the target params.
   */
  private getRedirectUri(target: AuthTarget): string {
    const param = target.params.find((p) => p.key === 'redirect_uri');
    return param?.value ?? '';
  }

  /**
   * Opens a URL in InAppBrowser and resolves when the browser is closed.
   * If callbackPath is provided, watches for URL navigation to that path
   * and auto-closes the browser when detected.
   */
  private openInBrowser(url: string, callbackPath?: string, redirectUri?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const listeners: any[] = [];

      const cleanup = () => {
        listeners.forEach(handle => handle.remove());
      };

      // Watch for redirect URL if callbackPath is provided
      if (callbackPath) {
        const navListener = InAppBrowser.addListener('browserPageNavigationCompleted', (event) => {
          if (settled || !event.url) return;
          try {
            const eventUrl = new URL(event.url);
            if (eventUrl.pathname === callbackPath || (redirectUri && event.url.startsWith(redirectUri))) {
              settled = true;
              cleanup();
              InAppBrowser.close().catch(() => {});
              resolve();
            }
          } catch {
            // Invalid URL — ignore
          }
        });
        listeners.push(navListener);
      }

      // Listen for browser closed (user closed manually)
      const closeListener = InAppBrowser.addListener('browserClosed', () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      });
      listeners.push(closeListener);

      InAppBrowser.openInWebView({
        url,
        options: {
          showURL: false,
          showToolbar: true,
          clearCache: false,
          clearSessionCache: false,
          mediaPlaybackRequiresUserAction: false,
          closeButtonText: 'Close',
          toolbarPosition: 0,
          showNavigationButtons: false,
          leftToRight: false,
          android: {
            allowZoom: false,
            hardwareBack: true,
            pauseMedia: true,
          },
          iOS: {
            allowOverScroll: false,
            enableViewportScale: false,
            allowInLineMediaPlayback: false,
            surpressIncrementalRendering: false,
            viewStyle: 2,
            animationEffect: 2,
            allowsBackForwardNavigationGestures: false,
          },
        },
      }).catch((err) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(err);
        }
      });
    });
  }

  /**
   * Opens the Sunbird portal signup page in InAppBrowser.
   * Passes redirect_uri so the portal can redirect back after registration.
   * Browser auto-closes when redirect is detected.
   */
  async openRegistration(): Promise<void> {
    const config = await this.getAuthConfig('register');
    const redirectUri = this.getRedirectUri(config.target);
    let url = this.buildUrl(config.target);
    url += (url.includes('?') ? '&' : '?') + 'client=mobileApp';

    // Extract the callback path from redirect_uri (e.g., /oauth2callback)
    let callbackPath: string | undefined;
    try {
      callbackPath = new URL(redirectUri).pathname;
    } catch {
      // No valid redirect_uri — just open without watching
    }

    await this.openInBrowser(url, callbackPath, redirectUri || undefined);
  }

  /**
   * Opens the Sunbird portal forgot password page in InAppBrowser.
   * Passes redirect_uri so the portal can redirect back after password reset.
   * Browser auto-closes when redirect is detected.
   */
  async openForgotPassword(): Promise<void> {
    const config = await this.getAuthConfig('register');
    const host = config.target.host;
    const redirectUri = this.getRedirectUri(config.target);

    // Build forgot password URL with redirect_uri and client params
    let url = `${host}/forgot-password`;
    url += `?client=mobileApp`;
    if (redirectUri) {
      url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    // Extract the callback path from redirect_uri
    let callbackPath: string | undefined;
    try {
      callbackPath = new URL(redirectUri).pathname;
    } catch {
      // No valid redirect_uri
    }

    await this.openInBrowser(url, callbackPath, redirectUri || undefined);
  }
}

export const authWebviewService = new AuthWebviewService();
