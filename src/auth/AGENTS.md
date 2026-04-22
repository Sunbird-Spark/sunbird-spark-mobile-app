# Auth — Agent Guide

## What Lives Here

Keycloak API calls and Google Sign-In integration.

```
auth/
  keycloakApi.ts   # POST /mobile/keycloak/login, /mobile/google/auth/android, token refresh
  types.ts         # Auth request/response types (AuthTokens, etc.)
```

Google Sign-In (native plugin initialisation and OAuth flow) lives in `src/services/auth/socialLogin/`. Token lifecycle (save, refresh, expiry) lives in `src/services/UserService.ts`. Session recovery on app start lives in `AppInitializer.ts`.

---

## Auth Flow

1. **Email/password login** — `POST /mobile/keycloak/login`
2. **Google Sign-In** — native Google auth → `POST /mobile/google/auth/android`
3. Tokens stored in `Capacitor SecureStoragePlugin` (not `localStorage`)
4. HTTP client sets `Authorization: Bearer <token>` using `AppConsumerAuthService.getAuthenticatedToken()` — device JWT from Kong (falls back to app JWT if Kong registration fails); sets `X-Authenticated-User-Token` to the user's Keycloak access token only when logged in; also sets `X-App-Id` and `X-Device-Id`
5. On app start — `AppInitializer` recovers the session from secure storage before any queries run

---

## Key Rules

- Never store tokens in `localStorage` or `sessionStorage`.
- Never read tokens directly outside of `src/services/auth/`.
- `AuthContext` (`src/contexts/AuthContext.tsx`) is the single source of truth for `isAuthenticated` and `userId` in the UI.
- Logout must call `Promise.allSettled()` over all DB table clears to avoid cascade failures.
