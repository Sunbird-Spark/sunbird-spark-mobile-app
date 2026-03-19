/** Response from POST /mobile/keycloak/login */
export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}

/** Persisted session data */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  userId: string;
  expires_at: number;
}

/** Error shape returned by the backend mobile auth routes */
export interface AuthApiError {
  error: string;
  error_msg: string;
  statusCode?: number;
}
