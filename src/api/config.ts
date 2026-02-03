import { init } from '../lib/http-client';
import { CapacitorAdapter } from '../lib/http-client/adapters/CapacitorAdapter';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';

export const initializeApiClient = async () => {
  const config = await NativeConfigServiceInstance.load();
  const baseURL = config.baseUrl || '';
  
  init(
    new CapacitorAdapter({
      baseURL,
      defaultHeaders: {
        'X-Source': 'mobile',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      statusHandlers: {
        401: () => {
        console.log('Unauthorized — logout');
        },
        403: () => {
        console.log('Access denied');

        },
      },
    })
  );
};