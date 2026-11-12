import { useEffect, useState } from 'react';
import { appInfoService } from '../services/AppInfoService';

/**
 * Whether the given SSO provider (e.g. `'google'`) is enabled on the portal
 * backend (`ENABLED_SSO_PROVIDERS`, served via `/portal/app/v1/info`).
 *
 * Defaults to `true` while loading or when the list is unavailable (offline,
 * older backend without the field), matching the Keycloak theme's `['google']`
 * fallback.
 */
export const useSsoProviderEnabled = (provider: string): boolean => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;
    appInfoService.getEnabledSsoProviders().then((providers) => {
      if (mounted && providers) setEnabled(providers.includes(provider.toLowerCase()));
    });
    return () => {
      mounted = false;
    };
  }, [provider]);

  return enabled;
};
