# Services — Agent Guide

## What Lives Here

All business logic for the app. Most services are singletons exported as pre-instantiated constants. Some (e.g., `ContentService`, `FormService`) are instantiated directly at the call site via `new`.

```
services/
  AppConsumerAuthService.ts   # Device-level auth token management
  AppUpdateService.ts         # Forced update flow
  AuthWebviewService.ts       # Webview-based auth flows
  CertificateService.ts       # Course certificate download
  ChannelManager.ts           # Sunbird channel/framework resolution
  ContentService.ts           # Content search and metadata fetch
  FormService.ts              # Dynamic form config fetch
  HttpService.ts              # Lightweight HTTP client using CapacitorHttp directly — for auth endpoints and full URLs that bypass the main API client
  NativeConfigService.ts      # Reads gradle.properties at runtime via Capacitor
  NavigationHelperService.ts  # Programmatic navigation helpers
  NotificationService.ts      # Local and push notification handling
  OrganizationService.ts      # Org/tenant data fetch
  OtpService.ts               # OTP request and verification
  QuestionSetService.ts       # QuML question set fetch
  SettingsService.ts          # App settings (language, storage location)
  SystemSettingService.ts     # Sunbird system settings fetch
  TelemetryContext.ts         # TypeScript interfaces for telemetry context and event input shapes
  TelemetryService.ts         # Stages and syncs telemetry events
  TnCService.ts               # Terms and conditions check and accept
  UserService.ts              # User profile fetch and update
  auth/                       # Google Sign-In (socialLogin service)
  consent/                    # User data consent
  content/                    # Content download, import, delete, playback resolution
  course/                     # Course progress, assessment submission
  db/                         # SQLite DB services (see db/AGENTS.md)
  device/                     # Device info, storage
  download_manager/           # Download queue management
  network/                    # Connectivity detection
  players/                    # Player context builder
  push/                       # Push notification registration
  sync/                       # Telemetry and network queue sync
  user_enrollment/            # Course enrollment
```

---

## Singleton Pattern

Every service follows this pattern:

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
- Backend error responses expose a `.code` property for categorization.

---

## Testing

Reset the singleton before each test so state does not leak between cases:

```typescript
beforeEach(() => {
  (SomeService as any).instance = undefined;
});
```

`NativeConfigService` must be mocked in all tests — it reads from native Android config which is unavailable in the test environment.
