# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SunbirdEd Mobile App is a hybrid educational mobile application built with Ionic React + Capacitor for cross-platform (Android/iOS) deployment from a single TypeScript/React codebase.

## Development Commands

```bash
# Install dependencies (required flag due to peer dep conflicts)
npm install --legacy-peer-deps

# Development
npm run dev              # Start Vite dev server
npm run build            # TypeScript check + production build
npm run preview          # Preview production build

# Code quality
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues
npm run type-check       # TypeScript type checking only
npm run format           # Check Prettier formatting
npm run format:write     # Auto-fix formatting

# Testing
npm run test             # Watch mode
npm run test:run         # Single run (CI mode)
npm run test:coverage    # Coverage report (70% threshold required)
npx vitest run src/path/to/Component.test.tsx  # Run a single test file

# Capacitor / Native
npx cap sync             # Sync web assets to native projects
npx cap open android     # Open Android Studio
npx cap run android      # Run on Android device/emulator
npm run livereload        # Live reload on Android device
```

## Architecture

### Entry Point & Initialization

- `src/main.tsx` — React root; wraps App in provider stack: `QueryProvider → NetworkProvider → AuthProvider → LanguageProvider`
- `src/AppInitializer.ts` — Initializes API client, sets Kong auth token headers, uses observable pattern for initialization listeners
- `src/App.tsx` — Calls `setupIonicReact()`, sets up `IonReactRouter` with all routes, shows `PageLoader` during initialization
- `src/api/config.ts` — API client initialization

### Directory Structure

```
src/
├── pages/           # Route-level components (default export, wrapped in IonPage)
├── components/      # Reusable UI organized by domain (common/, content/, courses/, home/, layout/, players/)
├── services/        # Business logic & API integration (auth/, device/, network/, players/, plus root services)
├── hooks/           # Custom React hooks for data fetching and state
├── contexts/        # React Contexts (AuthContext, LanguageContext)
├── providers/       # Provider components (NetworkProvider, QueryProvider)
├── types/           # TypeScript type definitions
├── lib/http-client/ # Custom Capacitor HTTP-based API wrapper
├── config/          # i18n setup (i18next with en, hi, fr, pt, ar)
├── locales/         # Translation JSON files
├── theme/           # Ionic CSS variables (variables.css)
└── __mocks__/       # Test mocks for Capacitor plugins
```

### Content Players

The app supports multiple content formats via `src/components/players/`:
- **ECML** — `EcmlPlayer` (iframe-based, postMessage with origin validation)
- **PDF** — `PdfPlayer`
- **EPUB** — `EpubPlayer`
- **QUML** — `QumlPlayer` (quiz/assessment)
- **Video** — `VideoPlayer`

Player services live in `src/services/players/`.

### HTTP / API Layer

All API calls use the Capacitor HTTP plugin (`@capacitor/core`), not fetch/axios. The custom wrapper is in `src/lib/http-client/`. Authentication uses Kong tokens (`X-Authenticated-User-Token` header).

### State Management

- **Server state**: `@tanstack/react-query` via custom hooks in `src/hooks/`
- **Auth state**: `AuthContext` in `src/contexts/`
- **Language state**: `LanguageContext`
- **Local component state**: `useState` / `useReducer`

## Code Conventions

### Ionic Components

All pages must be wrapped in `<IonPage>`. Use Ionic components (`IonButton`, `IonCard`, etc.) over plain HTML equivalents. Router must use `IonReactRouter` + `IonRouterOutlet`.

### TypeScript

- `.tsx` for components, `.ts` for utilities/services/hooks
- Type all props with interfaces; avoid `any` (use `unknown` + type guards)
- Config is currently permissive (no `strictNullChecks`) — improve typing incrementally
- Path alias: `@/` maps to `./src/`

### Styling Priority

1. Ionic component props (`color`, `fill`, `size`)
2. Ionic CSS utilities (`ion-padding`, `ion-text-center`)
3. Tailwind CSS classes (auto-sorted by Prettier)
4. Component-specific CSS files

### Formatting (Prettier)

Single quotes for strings, double quotes in JSX attributes, semicolons required, trailing commas, 2-space indent, 100-char line width. Run `npm run format:write` before committing.

### Exports

- Pages: default export
- Components, hooks, utilities: named export

### Testing

Co-locate tests with components (`Component.test.tsx`). Mock Capacitor plugins — see `src/__mocks__/` for existing mock patterns. Coverage threshold is 70% across statements, branches, functions, and lines.

### Git Commits

Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## CI/CD

Pull requests to `main` or `develop` run two jobs (Node.js 24.12.0):
1. **Lint** — `npm run lint`
2. **Test** — `npm run test:coverage` with Codecov upload

Requires `CODECOV_TOKEN` secret.
