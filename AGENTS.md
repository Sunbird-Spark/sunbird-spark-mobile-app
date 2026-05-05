# Sunbird Spark Mobile — Agent Guide

## What This Project Is

An **offline-first mobile education app** built as a React + Ionic + Capacitor application targeting Android devices. Part of the Sunbird open-source education platform. Supports content discovery, offline downloads, course enrollment, assessments, push notifications, and telemetry.

---

## Project Structure

```
src/
  pages/            # Top-level route components (*Page.tsx)
  components/       # Reusable UI organized by feature domain
  services/         # Business logic — most are singletons; some are instantiated per usage
  hooks/            # React Query wrappers (useQuery / useMutation)
  api/              # API client initialisation and response interceptor config
  auth/             # Keycloak API calls, Google Sign-In
  contexts/         # AuthContext, LanguageContext
  providers/        # QueryProvider, NetworkProvider, TelemetryProvider
  lib/http-client/  # HTTP client with adapter pattern (CapacitorAdapter)
  config/           # i18n setup and language config
  types/            # TypeScript type definitions
  constants/        # UPPER_SNAKE_CASE constants and enums
  locales/          # Translation files per language (en, fr, pt, ar, hi)
  utils/            # Utility functions
  assets/           # Fonts, placeholder images
android/            # Capacitor Android project
public/
  assets/           # Sunbird player assets (copied at install time — do not move)
  content-player/   # Content-player bundle (copied at install time — do not move)
```

---

## Key Commands

```bash
npm install             # Install deps; postinstall copies player assets automatically
npm run dev             # Vite dev server at http://localhost:8080
npm run build           # Type-check + bundle to dist/
npm run test:run        # Run tests once
npm run test:coverage   # Coverage report (70% threshold enforced)
npm run lint            # ESLint on src/
npm run format:write    # Prettier + auto-sort imports

# Build and deploy to device
npm run build && npx cap sync android   # Compile web assets and sync into the Android project
cd android && ./gradlew assembleDebug   # Build the debug APK
```

> Native plugins (SQLite, secure storage, push notifications, barcode scanner) do not work in the browser. Test native-dependent flows on a device or emulator.

---

## Architecture Notes

- **Offline-first** — content downloaded as `.ecar` files, metadata in SQLite, telemetry and failed API calls queued for later sync.
- **Service singletons** — most services export a pre-instantiated singleton. Some (e.g. `ContentService`, `FormService`) are instantiated at the call site. See `src/services/AGENTS.md`.
- **React Query + AuthContext** — server state via TanStack Query v5; auth state via `AuthContext`. See `src/hooks/AGENTS.md`.
- **Routing guards** — `OnboardingGuard`, `TnCGuard`, `AppUpdateGuard`, `LogoutGuard`, `PushNotificationGuard` sit inside `IonReactRouter` and handle redirects as side effects.
- **Content players** — Sunbird web components rendered directly in the DOM. See `src/components/players/AGENTS.md`.
- **Auth** — Keycloak + Google Sign-In, tokens in SecureStorage, JWT injected on every request. See `src/auth/AGENTS.md`.
- **HTTP client** — adapter pattern; only `CapacitorAdapter` exists. See `src/lib/http-client/AGENTS.md`.
- **Database** — SQLite via `@capacitor-community/sqlite`. See `src/services/db/AGENTS.md`.

---

## Coding Conventions

- `noImplicitAny: false`, `strictNullChecks: false` — do not tighten tsconfig settings.
- Use `@/` path alias for all imports from `src/`.
- Imports are auto-sorted by `prettier-plugin-organize-imports` — run `npm run format:write`, do not reorder manually.
- Component props interfaces use the `*Props` suffix.
- Types in `src/types/`, constants in `src/constants/` as `UPPER_SNAKE_CASE`.
- React Router **v5** is in use — do not introduce v6 APIs (`useNavigate`, `<Routes>`, `<Outlet>`).

---

## Important Constraints

- **Android only.** Do not add iOS-specific Capacitor config or plugins.
- **Player assets must stay in `public/assets/`.** Copied at install time via `postinstall`.
- **`android/gradle.properties` must be treated as local-only and must not contain committed credentials.** Ensure it is not tracked in git, and use `android/gradle.properties.example` as the template. Required fields: `base_url`, `mobile_app_consumer`, `mobile_app_key`, `mobile_app_secret`, `producer_id`.
- **Coverage threshold is 70%** for lines, branches, functions, and statements. Run `npm run test:coverage` before submitting changes.
