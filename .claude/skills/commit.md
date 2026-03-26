# Commit Skill

You are creating a git commit for changes in the **SunbirdEd Mobile App** repository. Follow these steps:

## Steps

1. Run `git status` to see what's changed
2. Run `git diff --staged` to see staged changes (if nothing staged, run `git diff HEAD`)
3. Run `git log --oneline -10` to understand recent commit message style
4. Analyse the changes and determine the commit type and scope
5. Stage appropriate files if nothing is staged yet (ask the user before staging if unsure)
6. Present the proposed commit message to the user for confirmation before committing
7. Create the commit

## Commit Message Format

```
{type}({scope}): {short description}

{optional body — only if the change needs explanation}
```

### Types

- `feat` — new feature or UI component
- `fix` — bug fix
- `refactor` — code restructure without behaviour change
- `style` — formatting, Tailwind class changes with no logic change
- `test` — adding or fixing tests
- `chore` — build, config, dependency changes
- `docs` — documentation only
- `a11y` — accessibility improvements
- `i18n` — translation/localisation changes
- `perf` — performance improvement

### Scope

Use the area of the codebase being changed:

**Pages & Navigation:**
- `home` — home page and its sections
- `explore` — explore/search page
- `courses` — course details, learning, collection
- `dashboard` — dashboard and my learning
- `profile` — profile and personal details
- `downloads` — downloaded content management
- `player` — content player page routing

**Components:**
- `components` — shared/reusable components
- `players` — content player components (EcmlPlayer, PdfPlayer, QumlPlayer, etc.)
- `layout` — layout wrappers, bottom navigation
- `content` — content cards and display components

**Services & Data:**
- `services` — business logic services (ContentService, ChannelService, etc.)
- `hooks` — custom React hooks
- `auth` — authentication services and Kong token handling
- `api` — API client and AppInitializer configuration
- `http-client` — Capacitor HTTP wrapper layer

**Native & Config:**
- `android` — Android-specific native changes
- `ios` — iOS-specific native changes
- `capacitor` — Capacitor configuration and plugin setup
- `config` — app configuration, i18n setup
- `build` — Vite, TypeScript, ESLint, package.json changes
- `ci` — GitHub Actions workflows

### Rules

- Subject line: max 72 characters, imperative mood ("add", not "added" or "adds")
- No period at the end of the subject line
- Body (if needed): explain *why*, not *what* — the diff shows what
- Reference issue numbers if relevant: `fixes #123`

## Examples

```
feat(players): add origin validation to ECML iframe postMessage handler

Prevents malicious iframes from triggering player lifecycle actions
by rejecting messages from unexpected origins.
```

```
fix(auth): refresh Kong token before expiry to prevent 401 errors
```

```
refactor(services): extract ContentService search logic into useContentSearch hook

Moves data-fetching concerns out of the page component and into a
dedicated hook, enabling reuse across ExplorePage and SearchPage.
```

```
chore(build): bump @project-sunbird/content-player to v8.0.0
```

```
test(players): add unit tests for QumlPlayer postMessage security
```

```
i18n(home): add missing Hindi translations for FAQ section
```

---

After analysing the changes, present the proposed commit message to the user for confirmation before committing.
