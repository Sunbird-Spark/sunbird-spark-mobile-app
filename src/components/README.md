# Components

Reusable UI components for the SunbirdEd mobile app.

## Available Components

### LanguageSwitcher

A dropdown selector that allows users to switch between multiple languages.

**Usage:**

```tsx
import LanguageSwitcher from '@/components/LanguageSwitcher';

<LanguageSwitcher color="primary" interface="popover" />;
```

**Props:**

- `color?: string` - Ionic color variant (default: 'primary')
- `interface?: 'action-sheet' | 'popover' | 'alert'` - Selection UI style (default: 'popover')

**Adding New Languages:**

1. Create translation file in `src/locales/` (e.g., `ta.json` for Tamil)
2. Add to `src/config/i18n.ts` resources
3. Add language to the `languages` array in `LanguageSwitcher.tsx`:

```tsx
const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  // Add more languages...
];
```

## Guidelines

- All components should be functional components with TypeScript
- Export components as named exports for utilities, default for main components
- Co-locate tests with components (ComponentName.test.tsx)
- Use Ionic components as building blocks
- Support internationalization with react-i18next where applicable
