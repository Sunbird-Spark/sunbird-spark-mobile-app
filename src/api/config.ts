import { init } from '../lib/http-client';
import { CapacitorAdapter } from '../lib/http-client/adapters/CapacitorAdapter';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';

export const initializeApiClient = async () => {
  const config = await NativeConfigServiceInstance.load();
  
  init(
    new CapacitorAdapter({
      baseURL: config.baseUrl || 'https://api.yourserver.com', // Fallback to default if not configured
      statusHandlers: {
        401: () => {
          console.log('Unauthorized — logout');
          // logout();
        },
        403: () => {
          console.log('Access denied');
          // showAccessDeniedToast();
        },
      },
    })
  );
};
