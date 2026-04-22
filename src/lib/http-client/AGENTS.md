# HTTP Client — Agent Guide

## What Lives Here

HTTP client with an adapter pattern for switching transport.

```
lib/http-client/
  BaseClient.ts             # Core client — applies the responseInterceptor on 401/403
  adapters/
    CapacitorAdapter.ts     # Only transport adapter — uses Capacitor HTTP plugin
  offlineResponse.ts        # Wraps SQLite data into ApiResponse shape so offline reads are transparent to callers
  types.ts                  # Request/response types, interceptor interfaces
  index.ts                  # Exports init(), getClient(), setLogoutCallback(), getLogoutCallback()
```

---

## Architecture Notes

**Headers set on the HTTP client during app init:**
- `Authorization` — `Bearer <token>` from `AppConsumerAuthService.getAuthenticatedToken()`. Primarily the device JWT (obtained by registering the device with Kong using the app JWT). Falls back to the app JWT (signed with `mobileAppSecret`) if Kong registration fails.
- `X-Authenticated-User-Token` — user's Keycloak access token from `UserService.getAccessToken()`. Set only when `userService.isLoggedIn()` is true.
- `X-App-Id` — `producerId` from native config.
- `X-Device-Id` — hashed device ID.

**4xx/5xx errors** — `CapacitorAdapter` throws the response object (not returns it) for any `status >= 400`. Callers must catch thrown responses to handle errors.

**Offline reads** — `buildOfflineResponse()` from `offlineResponse.ts` wraps SQLite data into the `ApiResponse` shape. Services use this so callers (hooks, React Query) handle offline and online data identically.

**Adapter pattern** — `BaseClient` does not depend on any specific HTTP library. The only current adapter is `CapacitorAdapter`. A new transport can be added by implementing the adapter interface and passing it to `init()`.

---

## Two HTTP clients

| Client | Where | Used for |
|---|---|---|
| `BaseClient` / `CapacitorAdapter` | `src/lib/http-client/` | All `/api` routes — auth headers set at init, throws on 4xx/5xx |
| `HttpService` | `src/services/HttpService.ts` | Auth endpoints, certificate downloads — full URLs, no interceptor, raw `CapacitorHttp` |

Do not use `HttpService` for routes that need the interceptor chain. Do not use `getClient()` for routes that bypass `/api`.
