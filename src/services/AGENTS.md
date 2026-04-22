# Services — Agent Guide

## What Lives Here

All business logic for the app. Most services are singletons exported as pre-instantiated constants. Some (e.g., `ContentService`, `FormService`) are instantiated directly at the call site via `new`.

```
services/
  AppConsumerAuthService.ts   # Device-level auth token management
  AppUpdateService.ts         # Checks for app update availability and redirects to app store
  AuthWebviewService.ts       # Webview-based auth flows
  CertificateService.ts       # Certificate search and download pipeline (search by user/course, download SVG, convert and save to device)
  ChannelManager.ts           # Manages channel ID and sets x-channel-id HTTP header
  ContentService.ts           # Content search and metadata fetch
  FormService.ts              # Dynamic form config fetch
  HttpService.ts              # Lightweight HTTP client using CapacitorHttp directly — for auth endpoints and full URLs that bypass the main API client
  NativeConfigService.ts      # Reads gradle.properties at runtime via Capacitor
  NavigationHelperService.ts  # Tracks page navigation timing and deduplicates same-URL navigations
  NotificationService.ts      # Notification feed API — read, update, delete; also exports date grouping and template message parsing utilities
  OrganizationService.ts      # Org/tenant data fetch
  OtpService.ts               # OTP request and verification
  QuestionSetService.ts       # QuML question set fetch
  SettingsService.ts          # App settings (sync preference, download preference, app version)
  SystemSettingService.ts     # Sunbird system settings fetch
  TelemetryContext.ts         # TypeScript interfaces for telemetry context and event input shapes
  TelemetryService.ts         # Stages telemetry events to SQLite via the Sunbird telemetry SDK
  TnCService.ts               # Utility functions to check if TnC acceptance is needed and extract TnC data from user profile
  UserService.ts              # Session management (save/clear tokens), user profile read and update, TnC acceptance
  auth/                       # Google Sign-In (socialLogin service)
  consent/                    # User data consent
  content/                    # Download helpers for individual content items, courses, and spine ECARs (metadata-only ZIPs that seed the hierarchy tree); content deletion; hierarchy utilities; playback URL resolution
  course/                     # Batch management, course progress calculation, content state sync, enrollment mapping, certificate search
  db/                         # SQLite DB services (see db/AGENTS.md)
  device/                     # Device ID, hashed device ID, device state
  download_manager/           # Download queue management and .ecar file import (extract, copy assets)
  network/                    # Connectivity detection
  players/                    # Telemetry context builder (PlayerContextService) and per-player services (pdf, epub, quml, video, ecml) for player init and event handling
  push/                       # Push notification registration and notification tap routing
  sync/                       # Telemetry, course progress, and assessment event sync — scheduled and on-demand
  user_enrollment/            # Course enrollment
```

---

## Singleton Pattern

Singleton services follow this pattern:

```typescript
export class SomeService {
  private static instance: SomeService;

  static getInstance(): SomeService {
    if (!SomeService.instance) SomeService.instance = new SomeService();
    return SomeService.instance;
  }
}

export const someService = SomeService.getInstance();
```

**For singleton services, always import the exported constant** (`someService`), not the class. Do not call `new SomeService()` or `SomeService.getInstance()` at the call site. For non-singleton services like `ContentService` and `FormService`, instantiate via `new` at the call site as they already do.

---

## Error Handling

- Wrap async operations in `try-catch`.
- Offline-aware operations are expected to fail silently — do not surface errors to the user unless actionable.
- Use `Promise.allSettled()` when clearing multiple resources in parallel (e.g., on logout) to prevent cascade failures.
- Auth errors (from `keycloakApi.ts`) expose a `.code` property for categorization (e.g. `invalid_credentials`, `REFRESH_FAILED`).

---

## Testing

Reset the singleton before each test so state does not leak between cases:

```typescript
beforeEach(() => {
  (SomeService as any).instance = undefined;
});
```

`NativeConfigService` must be mocked in all tests — it reads from native Android config which is unavailable in the test environment.
