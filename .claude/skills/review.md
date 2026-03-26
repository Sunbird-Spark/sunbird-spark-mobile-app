# Review Skill

Perform a structured code review for changes in the **SunbirdEd Mobile App** (Ionic React 8 + Capacitor 7 + TypeScript).

## Process

1. Run `git diff HEAD` (or `git diff --staged`) to identify changed files
2. Read each changed TypeScript/TSX file in full
3. Run `npm run type-check` and `npm run lint` — note any failures
4. Review each file against the checklist below
5. Output findings grouped by file with severity labels

## Severity Labels

- **Critical** — security vulnerability, broken functionality, must fix before merge
- **Warning** — correctness issue or bad pattern, should fix
- **Suggestion** — optional improvement for readability or maintainability

## Checklist

### Type Safety
- [ ] No `any` types — use `unknown` with guards or specific interfaces
- [ ] No unguarded non-null assertions (`!`)
- [ ] Array/object access uses optional chaining or guards
- [ ] Capacitor plugin return values are typed

### React & Ionic
- [ ] All pages wrapped in `<IonPage>`
- [ ] `useEffect` dependency arrays complete
- [ ] No direct state mutation
- [ ] Server state managed via TanStack React Query
- [ ] Ionic components used instead of native HTML equivalents
- [ ] `IonReactRouter` / `useIonRouter` used for navigation

### Async & Error Handling
- [ ] All Capacitor plugin calls have try/catch
- [ ] No `async` in `forEach` — use `Promise.all` or `for...of`
- [ ] `JSON.parse` wrapped in try/catch
- [ ] Loading and error states visible in UI

### Security
- [ ] postMessage handlers validate `event.origin` (critical for ECML/QUML players)
- [ ] Sensitive data stored in secure storage, not `localStorage`
- [ ] No hardcoded tokens, keys, or secrets
- [ ] No direct HTTP calls — all via `src/lib/http-client`

### Mobile / Capacitor
- [ ] Platform detection uses `Capacitor.getPlatform()`, not user-agent strings
- [ ] File URIs use `Capacitor.convertFileSrc()` where needed

### UI & Styling
- [ ] No hardcoded colours — use `--ion-color-*` variables or Tailwind tokens
- [ ] Tailwind classes are sorted (Prettier handles this)

### i18n
- [ ] No hardcoded user-visible strings — use `t('key')`
- [ ] New keys added to all locale files

### Tests
- [ ] New logic has a co-located test file
- [ ] Capacitor plugins mocked in tests
- [ ] 70% coverage maintained

## Output Format

```
### src/path/to/File.tsx

**Critical**
- Line N: <issue description>

**Warning**
- Line N: <issue description>

**Suggestion**
- Line N: <issue description>
```

Finish with verdict: **Approved**, **Approved with suggestions**, **Changes requested**, or **Blocked**.
