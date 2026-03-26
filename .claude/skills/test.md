# Test Skill

You are writing or reviewing tests for the **SunbirdEd Mobile App** — Ionic React 8 + Capacitor 7 + TypeScript, using **Vitest 4** + **React Testing Library 16**.

## Quick Start

**Identify your target** (component, hook, service), then run:

```bash
# All tests
npm run test:run

# Single file
npx vitest run src/path/to/Component.test.tsx

# Pattern match
npx vitest run --reporter=verbose -t "pattern name"

# Coverage report (must meet 70% threshold)
npm run test:coverage
```

Coverage report opens at `coverage/index.html`.

## File Conventions

- Tests co-locate with source: `MyComponent.tsx` → `MyComponent.test.tsx`
- Mocks for Capacitor plugins: `src/__mocks__/`
- Test setup: `src/setupTests.ts`
- Test environment: `happy-dom`

## Key Testing Patterns

### Components with Ionic

Wrap in `IonApp` or at minimum render with the necessary providers:

```tsx
import { IonApp } from '@ionic/react';
import { render, screen } from '@testing-library/react';

render(
  <IonApp>
    <MyComponent />
  </IonApp>
);
```

### Components with TanStack Query

Always wrap with a fresh `QueryClient` per test:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

render(
  <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
);
```

### Mocking Capacitor Plugins

Capacitor plugins must be mocked in tests — they throw on non-native platforms. Add mocks to `src/__mocks__/` or inline:

```ts
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));
```

### Mocking the HTTP Client

Mock at the service level rather than the Capacitor HTTP layer:

```ts
vi.mock('@/services/ContentService', () => ({
  ContentService: {
    search: vi.fn().mockResolvedValue({ result: { content: [] } }),
  },
}));
```

### Testing Custom Hooks

Use `renderHook` from React Testing Library:

```tsx
import { renderHook, waitFor } from '@testing-library/react';

const { result } = renderHook(() => useContentSearch({ query: 'maths' }), {
  wrapper: ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  ),
});

await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

### Testing postMessage Handlers (Player Security)

```ts
it('ignores messages from unexpected origins', () => {
  const handler = vi.fn();
  const event = new MessageEvent('message', {
    origin: 'https://malicious.example.com',
    data: { action: 'PLAY' },
  });
  window.dispatchEvent(event);
  expect(handler).not.toHaveBeenCalled();
});
```

## Coverage Requirement

All metrics (statements, branches, functions, lines) must stay at **≥ 70%**. CI fails if thresholds aren't met.

Excluded from coverage: `main.tsx`, `setupTests.ts`, `*.d.ts`, config files, `mockData` directories.

## Module Locations

| Target | Location |
|--------|----------|
| Page components | `src/pages/` |
| Reusable components | `src/components/` |
| Custom hooks | `src/hooks/` |
| Services | `src/services/` |
| HTTP client | `src/lib/http-client/` |
| Contexts | `src/contexts/` |
| Capacitor mocks | `src/__mocks__/` |
