import { AppConsumerAuthService } from '../AppConsumerAuthService';
import { userService } from '../UserService';
import { syncConfig } from './SyncConfig';
import { NetworkQueueType } from './types';

const appConsumerAuthService = AppConsumerAuthService.getInstance();

export class AuthHeadersBuilder {
  async build(type: NetworkQueueType): Promise<Record<string, string>> {
    const kongToken = await appConsumerAuthService.getAuthenticatedToken();

    const headers: Record<string, string> = {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${kongToken}`,
      'X-App-Id':      syncConfig.getProducerId(),
      'X-Channel-Id':  syncConfig.getChannelId(),
    };

    const userToken = userService.getAccessToken();
    if (userToken) {
      headers['X-Authenticated-User-Token'] = userToken;
    }

    if (type === NetworkQueueType.TELEMETRY) {
      // Must be octet-stream, not application/json: CapacitorHttp Android's
      // setRequestBody() only reaches the Base64→binary decode path when
      // Content-Type does not contain "application/json". The server still
      // decompresses via Content-Encoding: gzip and parses the body as JSON.
      headers['Content-Type']     = 'application/octet-stream';
      headers['Content-Encoding'] = 'gzip';
    }

    return headers;
  }
}

export const authHeadersBuilder = new AuthHeadersBuilder();
