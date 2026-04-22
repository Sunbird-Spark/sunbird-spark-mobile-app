# Auth — Agent Guide

## What Lives Here

Keycloak API calls and Google Sign-In integration.

```
auth/
  keycloakApi.ts   # POST /mobile/keycloak/login, /mobile/google/auth/android, token refresh
  index.ts         # Re-exports
  types.ts         # Auth request/response types
```

Token lifecycle and session recovery live in `src/services/auth/`.

---

## Auth Flow

1. **Email/password login** — `POST /mobile/keycloak/login`
2. **Google Sign-In** — native Google auth → `POST /mobile/google/auth/android`
3. Tokens stored in `Capacitor SecureStoragePlugin` (not `localStorage`)
4. HTTP client injects `Authorization` (device JWT) and `X-Authenticated-User-Token` (user JWT) on every request
5. On 401 — interceptor calls `POST /mobile/auth/v1/refresh/token`; on final failure, triggers logout
6. On app start — `AppInitializer` recovers the session from secure storage before any queries run

---

## Key Rules

- Never store tokens in `localStorage` or `sessionStorage`.
- Never read tokens directly outside of `src/services/auth/` — use the HTTP client interceptor.
- `AuthContext` (`src/contexts/AuthContext.tsx`) is the single source of truth for `isAuthenticated` and `userId` in the UI.
- Logout must call `Promise.allSettled()` over all DB table clears to avoid cascade failures.
