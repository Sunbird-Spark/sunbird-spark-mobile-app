# Sunbird Spark Mobile App
## Tech Overview

The Spark mobile app is built on **React + Ionic 8** with **Capacitor 8** as the native bridge. It runs natively on Android (minSdkVersion 26 / Android 8.0).

### Key Architectural Decisions

- **Vite as the build tool** — The app uses Vite 7 for fast hot module replacement during web development and faster production builds.
- **Offline-first design** — Content is downloaded as `.ecar` files (content packages) to device filesystem storage, with metadata tracked in SQLite. PDF, Video, ePub, and QuML players can render content from local files without any network connection.
- **Telemetry sync** — Telemetry events are staged in SQLite when offline and synced to the server in batches when connectivity is restored.
- **Multilingual support** — The app ships with translations for English, French, Portuguese, and Arabic. Arabic includes RTL layout support, and language preference is persisted in browser localStorage across sessions.

---

## Developer Setup

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | Ionic | 8.x |
| UI Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| Native Bridge | Capacitor | 8.x |
| Language | TypeScript | 5.x |
| Testing | Vitest + Testing Library | — |

### Prerequisites

Before cloning, ensure you have the following installed.

#### All Platforms

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22.x | Recommended for compatibility |
| npm | 10.x | Bundled with Node 22 |
| Git | Any recent | — |

#### Android Builds Only

| Tool | Version | Notes |
|---|---|---|
| Android Studio | Latest stable | — |
| Android SDK | compileSdk 36 (Android 15) | — |
| JDK | 17+ | Required by Gradle 8.11 |
| Gradle | 8.11.1 | Managed by the wrapper — no manual install needed |

> **Note:** iOS is not currently supported. The `ios/` platform has not been added to this project.

---

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd sunbird-spark-mobile-app
```

### Step 2 — Install Dependencies

```bash
npm install
```

This also runs two postinstall scripts automatically:

- **`copy-assets.js`** — Copies PDF, Video, ePub, and QuML player assets from `node_modules/@project-sunbird/*` into:
  - `public/assets/`
  - `public/content/assets/`
- **`scripts/copyContentPlayer.js`** — Assembles `@project-sunbird/content-player` into `public/content-player/` with any local overrides applied on top.

> ⚠️ If either script fails, check that all `@project-sunbird/*` packages were installed correctly before proceeding.

### Step 3 — Configure Environment Variables (Android)

Copy the example gradle properties file and fill in your backend credentials:

```bash
cp android/gradle.properties.example android/gradle.properties
```

Open `android/gradle.properties` and update the placeholder values:

```properties
base_url=https://your-sunbird-backend.org
mobile_app_consumer=mobile_device
mobile_app_key=<your-api-key>
mobile_app_secret=<your-api-secret>
producer_id=dev.sunbirded.org
```

> **Note:** `gradle.properties` is added to `.gitignore` and should never be committed. It contains sensitive credentials.

These values are injected as Android string resources at build time and read at runtime via the `capacitor-read-native-setting` plugin.

> ⚠️ The app will not connect to a backend without these values.

### Step 4 — Add Google Services for Push Notifications

Place your `google-services.json` file in:

```
android/app/
```

> **Note:** `google-services.json` is added to `.gitignore` and should never be committed. It contains sensitive Firebase credentials.

The build system checks for this file and applies the Google Services Gradle plugin conditionally.

### Step 5 — Build and Run on Android

```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && cd ..
```

| Command | Purpose |
|---|---|
| `npm run build` | Compiles TypeScript and bundles web assets into `dist/` |
| `npx cap sync android` | Copies `dist/` into the Android project and syncs native plugins |
| `./gradlew assembleDebug` | Builds the debug APK |

The output APK will be available at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

> **Tip:** Use `./gradlew clean assembleDebug` only when you suspect stale build artifacts (e.g., after changing native dependencies or syncing new Capacitor plugins).

### Open in Android Studio

```bash
npx cap open android
```

In Android Studio: Select a device/emulator from the dropdown and click the Run button (green play icon)

---

## How to Change the App ID

A script is provided to update the app ID across all required files automatically.

```bash
node scripts/update-app-id.js com.your.new.id
```

This will update the following files in one shot and run `npx cap sync android` at the end:

| File | What changes |
|---|---|
| `capacitor.config.ts` | `appId` |
| `android/app/build.gradle` | `namespace` + `applicationId` |
| `android/app/src/main/assets/capacitor.config.json` | `appId` |
| `android/app/src/main/res/values/strings.xml` | `package_name` + `custom_url_scheme` |
| `android/app/src/main/java/...` | Moves all `.java` files to the new package path + updates `package` declaration |

If anything fails mid-run, all file changes are rolled back automatically.

### Play Console Warning

> **The first AAB you upload to Play Console permanently locks the signing keystore for that app ID. Never change the keystore after the first upload.**

If you changed the keystore and got rejected by Play Console, the only fix is to register a new app ID and run the script above with the new ID.

---

## Theming System

The mobile app retints from a single block of CSS variables in `src/theme/variables.css` driven by 6 seed values per theme. Themes, fonts, and templates are defined in one file (`src/theme/themes.ts`) and applied at runtime via `ThemeContext`. The user picks color / font / template from the brush icon in any authenticated header — selection persists in `localStorage`.

Three concepts:

1. **Color theme** — 6 seed HSL values drive every brand color in the app.
2. **Font family** — 1 variable drives the font used everywhere.
3. **Template** — `data-template` attribute on `<html>` controls radius scale + flat/soft shadows. Picking a template also auto-applies its preset color theme and preset font.

---

### Part 1 — Colour Theme (6 Seed Values)

A theme is six HSL numbers. Open `src/theme/variables.css` and find the seed block at the top of `:root`:

```css
--sunbird-spark-theme-primary-h: 12;
--sunbird-spark-theme-primary-s: 50%;
--sunbird-spark-theme-primary-l: 45%;
--sunbird-spark-theme-chip-h: 45;
--sunbird-spark-theme-chip-s: 100%;
--sunbird-spark-theme-icon-h: 28;
```

Every other color token in the app — Ionic `--ion-color-primary` / `-shade` / `-tint`, Tailwind `--primary` / `--orange-primary`, brand-adjacent tokens (`--color-cc4b30`, `--color-ab4a2c`, `--color-a14f34`, `--color-d4874e`, `--color-fdf8f0`), warm-yellow surfaces (`--color-warm-yellow`), warning + warning-shade (used for hero ball / progress ring tracks) — is **derived** from these 6 seeds.

#### What each variable means

Colours use **HSL**: Hue–Saturation–Lightness.

- **Hue (h)** — `0–360`. `0` = red, `120` = green, `240` = blue.
- **Saturation (s)** — `0%–100%`. `0%` = gray, `100%` = vivid.
- **Lightness (l)** — `0%–100%`. `0%` = black, `50%` = pure, `100%` = white.

| # | Variable | Drives |
|---|---|---|
| 1 | `--sunbird-spark-theme-primary-h` | Hue of primary brand color (buttons, active links, progress fills, focus rings) |
| 2 | `--sunbird-spark-theme-primary-s` | Saturation of primary |
| 3 | `--sunbird-spark-theme-primary-l` | Lightness of primary |
| 4 | `--sunbird-spark-theme-chip-h` | Hue of chip/badge/secondary surfaces, warm-yellow, progress ring track |
| 5 | `--sunbird-spark-theme-chip-s` | Saturation of chip surfaces |
| 6 | `--sunbird-spark-theme-icon-h` | Hue of muted icons + primary-tint (hover) variants. Lightness locked for readability. |

Primary uses 3 values (hue + saturation + lightness) because the primary CTA needs exact shade control. Chip and icon only need hue — their lightness is fixed per token.

---

### Part 2 — Adding a New Color Theme

Open `src/theme/themes.ts` and append an entry to the `THEMES` array:

```ts
export const THEMES: ThemeSeed[] = [
  { id: 'terracotta', label: 'Terracotta', primaryH: 12,  primaryS: 50, primaryL: 45, chipH: 45,  chipS: 100, iconH: 28 },
  // ... existing themes ...

  // NEW:
  { id: 'forest', label: 'Forest', primaryH: 140, primaryS: 40, primaryL: 32, chipH: 140, chipS: 40, iconH: 130 },
];
```

That's it. The swatch in the ThemeSelector is auto-derived from `primaryH/S/L` (no swatch field needed). The progress ring track is auto-derived from `chipH` (no progressTrack field needed).

**You do NOT need to touch:**
- `variables.css` — seeds applied via JS by `applyTheme()`
- `ThemeContext.tsx`, `ThemeSelector.tsx` — read from `THEMES` array
- Any component — they all reference derived CSS variables

---

### Part 3 — Font Family

Default fonts (`src/theme/themes.ts`):

```ts
export const FONTS: FontOption[] = [
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'rubik',   label: 'Rubik',   family: "'Rubik', sans-serif" },
  { id: 'satisfy', label: 'Satisfy', family: "'Satisfy', cursive" },
  { id: 'lora',    label: 'Lora',    family: "'Lora', serif" },
];
```

The selected font's `family` is written to `--ion-font-family` on `<html>`, which is read by Ionic's font system and the global `body` rule.

**Language note:** Arabic (`ar`) and Hindi (`hi`) force script-specific fonts (Noto Sans Arabic / Devanagari) regardless of user font choice. Other languages honor the ThemeSelector pick.

---

### Part 4 — Adding a New Font

Two-step recipe:

**Step 1** — `src/index.css`: add font file source.

Option A — Google Fonts CDN (simplest):

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Satisfy&family=Lora:wght@400;500;600;700&family=Inter:wght@300..700&display=swap');
```

Option B — self-host woff2 in `src/assets/fonts/` with `@font-face` blocks (recommended for offline-first apps; pattern shown in `index.css` for Rubik / Noto Sans variants).

**Step 2** — `src/theme/themes.ts`: append to `FONTS`:

```ts
{ id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
```

That's it. Inter shows up in the ThemeSelector font list automatically.

---

### Part 5 — Template (Classic / Modern / Custom)

A template = `data-template` attribute on `<html>` + radius/shadow token scale + preset color + preset font.

Existing templates (`src/theme/themes.ts`):

```ts
export const TEMPLATES: TemplateOption[] = [
  { id: 'classic', label: 'Classic', description: 'Warm, rounded', presetThemeId: 'terracotta', presetFontId: 'rubik' },
  { id: 'modern',  label: 'Modern',  description: 'Sharp, bold',   presetThemeId: 'rose',       presetFontId: 'inter' },
];
```

When the user picks a template:
1. `data-template="<id>"` is set on `<html>` — CSS picks up token values from `src/theme/overrides.css`
2. The `presetThemeId` color is auto-applied
3. The `presetFontId` font is auto-applied
4. User can still override color or font afterward — template attr stays, color/font drift

#### How Radius (and Shadows) Work — Token-Driven (portal-parity)

Every surface in the app uses CSS variable tokens, not literal values:

```css
/* Component CSS — uses tokens, not literals */
.compact-course-card { border-radius: var(--r-md); box-shadow: var(--sunbird-shadow-md); }
.hero-cta-button     { border-radius: var(--r-sm); }
.profile-avatar      { border-radius: 50%; }   /* circles stay 50%, never tokens */
```

`src/theme/overrides.css` defines two kinds of design tokens, used everywhere in component CSS:

| Token family | Tokens | What it controls |
|---|---|---|
| **Radius** | `--r-xxs`, `--r-xs`, `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill` | `border-radius` on cards, buttons, inputs, modals, etc. Bigger token = bigger corner. `--r-pill` = fully round capsule. |
| **Shadow** | `--sunbird-shadow-sm`, `--sunbird-shadow-md`, `--sunbird-shadow-lg` | `box-shadow` on cards/popovers. `sm` = subtle, `md` = standard card, `lg` = elevated modal. |

The `:root` block sets the **first-paint defaults** (Classic look). Per-template blocks redefine the same tokens — that's the entire template system.

```css
/* :root — first-paint default (Classic values) */
:root {
  /* Radius scale: smaller key = sharper corner */
  --r-xxs: 0.25rem;   /* 4px  — small chip, tiny dot */
  --r-xs:  0.375rem;  /* 6px  — compact badge */
  --r-sm:  0.5rem;    /* 8px  — buttons, inputs */
  --r-md:  0.875rem;  /* 14px — cards, modals (default) */
  --r-lg:  1.25rem;   /* 20px — large cards, tiles */
  --r-xl:  1.75rem;   /* 28px — feature surfaces */
  --r-pill: 9999px;   /* fully round pills */

  /* Shadow scale: each one is `offset-x offset-y blur color` */
  --sunbird-shadow-sm: 0 0.125rem 0.5rem rgba(0,0,0,0.06);
  --sunbird-shadow-md: 0 0 0.75rem 0 rgba(0,0,0,0.12);
  --sunbird-shadow-lg: 0 0.25rem 1.25rem rgba(0,0,0,0.15);
}

/* Per-template — only the tokens change, no selector lists */
html[data-template="modern"] {
  --r-sm: 0.25rem; --r-md: 0.375rem; --r-lg: 0.5rem; --r-xl: 0.625rem; --r-pill: 0.5rem;
  --sunbird-shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --sunbird-shadow-md: 0 1px 3px rgba(0,0,0,0.06);
  --sunbird-shadow-lg: 0 2px 8px rgba(0,0,0,0.08);
}
```

**Mental model:** components ask for `var(--r-md)` — the value at lookup time depends on which template is active.

Because all components read tokens, redefining the tokens for a template **automatically retunes every card, button, modal, badge, input, etc.** — no per-component selectors needed.

A template **without** an override block inherits the `:root` (Classic) values.

---

### Part 6 — Adding a New Template

Two questions decide the workflow:

| Question | Answer | What you edit |
|---|---|---|
| Reuses existing color + font + radius? | Yes | `themes.ts` only |
| Needs new color or new font? | Yes | Add to `THEMES` / `FONTS` first (Parts 2 + 4), then `themes.ts` |
| Needs custom radius / shadow? | Yes | Add a token block in `overrides.css` |
| Skip the radius block | — | Template **automatically inherits Classic radii** (the `:root` defaults) |

**Case A — Keep Classic radius (no custom radius needed):**

One entry in `src/theme/themes.ts`. That's it.

```ts
{ id: 'professional', label: 'Professional', description: 'Blue rubik',
  presetThemeId: 'blue', presetFontId: 'rubik' }
```

No `overrides.css` change. The new template uses the same rounded radius as Classic.

**Case B — Want sharp/different radius for this template:**

Step 1: Add the template entry to `TEMPLATES` in `src/theme/themes.ts` (same as Case A).

Step 2: Add a token block in `src/theme/overrides.css`:

```css
html[data-template="<your-id>"] {
  --r-xxs: 0.125rem;
  --r-xs: 0.25rem;
  --r-sm: 0.25rem;
  --r-md: 0.5rem;
  --r-lg: 0.75rem;
  --r-xl: 1rem;
  --r-pill: 0.5rem;

  /* Optional — flatten shadows too */
  --sunbird-shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --sunbird-shadow-md: 0 1px 3px rgba(0,0,0,0.06);
  --sunbird-shadow-lg: 0 2px 8px rgba(0,0,0,0.08);
}
```

That's the **only** thing needed. No per-component selectors. Every card, button, modal in the app reads these tokens and auto-applies the new scale.

**Case C — New color or font:**

1. Add to `THEMES` (Part 2) and/or `FONTS` (Part 4) first.
2. Then add the template entry referencing the new ids.
3. Optionally add a radius token block (Case B).

**Why no per-component selectors anymore:** Component CSS already uses `var(--r-md)` etc. (migrated in the codebase). New components added later only need to use tokens — they become template-aware automatically.

---

### Part 7 — Default Theme on First Launch

On app start, `ThemeContext` reads `localStorage`:

| Key | Falls back to |
|---|---|
| `sunbird-theme` | `terracotta` (`DEFAULT_THEME_ID`) |
| `sunbird-font` | `rubik` (`DEFAULT_FONT_ID`) |
| `sunbird-template` | `classic` (`DEFAULT_TEMPLATE_ID`) |

So a fresh install loads: **Terracotta colors + Rubik font + Classic radius** = the original brick/ivory look.

To change defaults app-wide, edit these constants in `src/theme/themes.ts`:

```ts
export const DEFAULT_THEME_ID = 'terracotta';
export const DEFAULT_FONT_ID = 'rubik';
export const DEFAULT_TEMPLATE_ID = 'classic';
```

---

### Part 8 — How It Works at Runtime

`src/contexts/ThemeContext.tsx` owns the state:

```ts
{ themeId, fontId, templateId, setThemeId, setFontId, setTemplateId }
```

On any state change, the matching `apply*()` function from `themes.ts` writes the appropriate CSS variable or HTML attribute:

- `applyTheme(theme)` → sets `--sunbird-spark-theme-*` CSS vars on `<html>`
- `applyFont(font)` → sets `--ion-font-family` (unless Arabic/Hindi is active — see language note)
- `applyTemplate(id)` → sets `data-template="<id>"` on `<html>`

Picking a template via `setTemplateId(id)` cascades automatically: it calls `setThemeIdState(tpl.presetThemeId)` and `setFontIdState(tpl.presetFontId)` so the preset color + font fire too.

---

### Quick Reference — Where to Edit What

| To do this | Edit |
|---|---|
| Change default look (first launch) | `DEFAULT_*_ID` constants in `src/theme/themes.ts` |
| Add color theme | `THEMES` array in `src/theme/themes.ts` |
| Add font | `src/index.css` (`@import` or `@font-face`) + `FONTS` array in `src/theme/themes.ts` |
| Add template (Classic radius) | `TEMPLATES` array in `src/theme/themes.ts` only |
| Add template (custom radius) | `TEMPLATES` array + token block `html[data-template="<id>"] { --r-*: ...; --sunbird-shadow-*: ...; }` in `src/theme/overrides.css` |
| Tweak global radius scale for a template | Edit the matching `html[data-template="<id>"]` token block in `src/theme/overrides.css` |
| New component should be template-aware | Use `border-radius: var(--r-md)` and `box-shadow: var(--sunbird-shadow-md)` in the component's CSS — no other changes needed |
| Change which surfaces inherit chip-tinted tracks | `--sunbird-progress-track`, `--ion-color-warning*` in `src/theme/variables.css` |
| Show or hide the Theme Selector dropdown | `ENABLE_THEME_SELECTOR` in `src/config/featureFlags.ts` |

---

### Behavior Notes

- **Original look preserved** when all defaults are kept (Terracotta + Rubik + Classic).
- **Stat tiles are FIXED** (Total Courses teal, In Progress orange, Completed green, Certifications lavender) — they do NOT retint across themes. Matches portal `[FIXED]` parity. Defined in `src/components/home/learning-started/LearningStatsGrid.tsx` and `src/index.css` `.profile-stat-*` as static rgb literals.
- **Category gradients are FIXED** (decorative, not brand identity).
- **Google login G logo, Sunbird brand logo, dissolveParticles** stay static (brand identity).
- **Empty rating stars** stay gray (semantic unfilled state).
- **Notification trash icon** uses `currentColor` → inherits primary-tint via CSS class.
- **All ion components, Tailwind utilities, SVG strokes** using `var(--ion-color-primary, …)` retint automatically with theme change.

---

### Feature Flags

Build-time UI features can be toggled in one place, without touching environment files.

**`src/config/featureFlags.ts`**

```ts
// Set to true to show the Theme Selector dropdown in the header.
// Default: false (hidden).
export const ENABLE_THEME_SELECTOR = false;
```

#### `ENABLE_THEME_SELECTOR`

Controls the brush-icon dropdown rendered in the app headers — the public welcome header (`PublicWelcomeHeader`) and the in-app header used across the Explore, My Learning, Settings, and Help & Support pages. When `false` (the default), the dropdown is completely absent from the DOM — no hidden element, no dead tap target.

**To enable:**

```ts
// src/config/featureFlags.ts
export const ENABLE_THEME_SELECTOR = true;
```

**To disable:**

```ts
export const ENABLE_THEME_SELECTOR = false;
```

> **Note:** This is a build-time flag baked into the bundled web assets — it is **not** a runtime/remote toggle. After changing it you must rebuild the web bundle, sync it into the native project, and regenerate the APK before the change is visible on a device:
>
> ```bash
> npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && cd ..
> ```
>
> (During local web development, `npm run dev` hot-reloads the change in the browser instantly — but a packaged APK always requires the rebuild above. See [Step 5 — Build and Run on Android](#step-5--build-and-run-on-android).)

> **Note:** Disabling the selector only hides the picker UI. The `ThemeProvider` still reads any theme already persisted in `localStorage` and applies it on load — existing user selections are preserved. To reset a user's stored theme, clear the `sunbird-theme`, `sunbird-font`, and `sunbird-template` keys from `localStorage`.

---

### Adding a New Theme — Example

Say you want to add a **"Sunrise"** theme (warm orange) and a **"Sky"** template that bundles Sunrise + Poppins + Modern radius:

**1. Add color theme** — `src/theme/themes.ts`:

```ts
{ id: 'sunrise', label: 'Sunrise', primaryH: 24, primaryS: 95, primaryL: 53, chipH: 35, chipS: 100, iconH: 20 },
```

> **Note:** these 6 fields (`primaryH/S/L`, `chipH/S`, `iconH`) are the **same 6 seed values** from Part 1 — no new variables. They drive the same `--sunbird-spark-theme-*` CSS vars; `applyTheme()` just reads them off the THEMES entry. `id` and `label` are metadata (identifier + UI display name).

**2. Add template** — `src/theme/themes.ts`:

```ts
{ id: 'sky', label: 'Sky', description: 'Modern sunrise', presetThemeId: 'sunrise', presetFontId: 'poppins' },
```

**3. (Optional) Sky needs Modern radius — already exists.** If you want a custom radius scale just for Sky, add to `src/theme/overrides.css`:

```css
html[data-template="sky"] {
  --r-sm: 0.125rem;
  --r-md: 0.25rem;
  --r-lg: 0.5rem;
  --r-pill: 0.5rem;
}
```

Restart dev server. Both **Sunrise** swatch and **Sky** template appear in the ThemeSelector. Tap Sky → Sunrise colors + Poppins font + Sky radius applied atomically. User can still override color or font afterward.

---

### Cross-Repo Coupling — Mobile ↔ Portal ↔ Keycloak

Mobile theming (colour / font / template) is **id-based and tightly coupled** with two other apps. When the app opens an auth flow (login, signup, forgot-password) in the InAppBrowser, it passes the active selection as ids — `?theme=<id>&font=<id>&template=<id>` — to the **portal**, which persists them and forwards them to the **Keycloak** login pages via same-origin `localStorage`.

Each app looks ids up in its **own** catalog. **An id that exists only in the mobile app will fall back to defaults on the portal and Keycloak pages** (Classic + terracotta + Rubik). So adding a new theme/font/template to mobile alone themes only the native app — not the InAppBrowser portal pages or the Keycloak sign-in / new-password pages.

**To make a new mobile colour / font / template reflect everywhere, mirror it in all three repos.** Quick map:

| Add to mobile (`src/theme/themes.ts`) | Also add to Portal | Also add to Keycloak |
|---|---|---|
| `THEMES` (id + 6 seeds) | `COLOR_PALETTES` (same id + seeds) in `frontend/src/theme/themes.ts` | `THEME_MAP` (same id + seeds) in `…/login/template.ftl` |
| `FONTS` (id + family) | `FONTS` + font source in `frontend/src/fonts.css` | `FONT_MAP` + `@font-face` in `…/login/resources/css/login.css` |
| `TEMPLATES` (id) | `TEMPLATES` (+ radius block in `template-overrides.css`) | `html[data-template="<id>"]` token block in `…/login/resources/css/login.css` |

Repos referenced below: **Portal** = `sunbird-spark-portal`, **Keycloak theme** = `sunbird-spark-installer/scripts/keycloak-21.1.2/themes/sunbird/login/`.

#### Detailed walkthrough

Worked example: a new **`sunset`** colour (`primaryH 18, primaryS 80, primaryL 50, chipH 30, chipS 90, iconH 22`), a new **`mont`** font (Montserrat), and a new **`royal`** template.

**A) New colour — `sunset`**

1. **Portal** — `frontend/src/theme/themes.ts`. Add to `COLOR_PALETTES` (portal uses string percentages, mobile uses plain numbers — same values, different notation):
   ```ts
   { id: 'sunset', name: 'Sunset',
     seeds: { primaryH: 18, primaryS: '80%', primaryL: '50%', chipH: 30, chipS: '90%', iconH: 22 } },
   ```
   Then add a `THEMES` entry so it's user-selectable, binding a default font:
   ```ts
   { id: 'sunset', name: 'Sunset', colorId: 'sunset', fontId: 'rubik' },
   ```
   Nothing else — every component reads the derived CSS vars; the swatch auto-derives from the seeds.

2. **Keycloak** — `…/login/template.ftl`. Find the `THEME_MAP` object in the inline `<script>` and add the same id with the same 6 seeds (note keys: `ph ps pl ch cs ih`, percentages as strings):
   ```js
   sunset: { ph: 18, ps: '80%', pl: '50%', ch: 30, cs: '90%', ih: 22 },
   ```
   The FTL writes these to the `--sunbird-spark-theme-*` CSS vars on first paint, so `login.css` retints automatically — no CSS edit needed for a colour.

**B) New font — `mont` (Montserrat)**

1. **Portal** — add the font source so the browser can render it. In `frontend/src/fonts.css` add an `@font-face` (self-hosted woff2 in `frontend/public/fonts/`) or an `@import`:
   ```css
   @font-face {
     font-family: 'Montserrat';
     src: url('/fonts/montserrat-variable.woff2') format('woff2');
     font-weight: 100 900; font-display: swap;
   }
   ```
   Then register it in `frontend/src/theme/themes.ts` `FONTS`:
   ```ts
   { id: 'mont', name: 'Montserrat', value: "'Montserrat', sans-serif" },
   ```

2. **Keycloak** — host the same woff2 under `…/login/resources/css/fonts/` and add an `@font-face` at the top of `…/login/resources/css/login.css`:
   ```css
   @font-face {
     font-family: 'Montserrat';
     src: url('fonts/montserrat-variable.woff2') format('woff2');
     font-weight: 100 900; font-display: swap;
   }
   ```
   Then add the id → family mapping to `FONT_MAP` in `…/login/template.ftl`:
   ```js
   mont: "'Montserrat', sans-serif",
   ```
   The FTL sets `--app-font-family` from this; buttons, inputs, and placeholders already consume it.

**C) New template — `royal`**

1. **Portal** — `frontend/src/theme/themes.ts`. Widen the union and add the template:
   ```ts
   // interface TemplateOption
   id: 'classic' | 'modern' | 'royal';

   // TEMPLATES array — presetThemeId/presetFontId must already exist
   { id: 'royal', name: 'Royal', description: 'Regal serif',
     presetThemeId: 'purple', presetFontId: 'lora' },
   ```
   If `royal` needs its own radius/shadow scale, add a token block in `frontend/src/styles/template-overrides.css` (omit it to inherit Classic):
   ```css
   html[data-template="royal"] {
     --r-sm: 0.25rem; --r-md: 0.5rem; --r-lg: 0.75rem; --r-pill: 0.5rem;
     --r-auth-frame: 1rem; --r-auth-panel: 1rem;
   }
   ```

2. **Keycloak** — `…/login/resources/css/login.css`. The FTL already sets `data-template="<any id>"`, so just add a token block redefining the radius/shadow tokens for `royal` (mirrors the existing `html[data-template="modern"]` block):
   ```css
   html[data-template="royal"] {
     --r-frame: 1rem;
     --r-lg: 6px; --r-md: 6px; --r-sm: 6px; --r-xs: 6px;
     --shadow-frame: 0 8px 20px rgba(0,0,0,0.12);
     --shadow-card: 0 4px 10px rgba(0,0,0,0.08);
   }
   ```
   Every panel/input/button consumes these tokens, so no per-element selectors are needed. Omit the block to inherit the Classic (`:root`) look.

**After any Keycloak edit:** bump `styles=css/login.css?v=…` (or `template.ftl` is picked up on image rebuild) in `…/login/theme.properties` — any new `?v` value busts the browser/CDN cache — then rebuild the Keycloak image and redeploy the pod.

**Defaults are safe:** unknown ids never break the other apps. The portal ignores an unknown `?theme/font/template` id (keeps its current/default selection); Keycloak's `THEME_MAP`/`FONT_MAP` lookups miss and fall back to the CSS `:root` defaults (Classic + terracotta + Rubik). So a mobile-only addition simply won't theme the portal/Keycloak pages — it won't error.
