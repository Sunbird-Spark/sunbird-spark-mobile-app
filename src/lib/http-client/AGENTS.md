# HTTP Client — Agent Guide

## What Lives Here

HTTP client with request/response interceptors and an adapter pattern for switching transport.

```
lib/http-client/
  BaseClient.ts      # Core client — applies interceptors, injects auth headers
  adapters/          # Transport adapters (Axios, CapacitorHttp, etc.)
  offlineResponse.ts # Returns a synthetic offline error response when no connection
  types.ts           # Request/response types, interceptor interfaces
  index.ts           # Exports the configured client instance
```

---

## Architecture Notes

**Every outgoing request gets two headers injected by the interceptor:**
- `Authorization` — device JWT (from `AppConsumerAuthService`)
- `X-Authenticated-User-Token` — user JWT (from `src/services/auth/`)

**401 handling** — the interceptor calls `POST /mobile/auth/v1/refresh/token`. If the refresh fails, it calls logout and rejects the original request.

**Offline handling** — `offlineResponse.ts` is returned immediately when `NetworkService` reports no connection, without hitting the network.

**Adapter pattern** — swap the underlying transport (Axios, CapacitorHttp) by providing a different adapter. The `BaseClient` does not depend on any specific HTTP library.

---

## Usage

Import `HttpService` from `src/services/HttpService.ts`, not the client directly. `HttpService` is the singleton used by all other services.

Do not call `BaseClient` or the adapters directly from feature code.
