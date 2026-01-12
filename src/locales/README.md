# Locales

Internationalization (i18n) translation files for the Sunbird mobile app.

## Available Languages

- **English (en)** - Default language
- **Hindi (hi)** - हिन्दी

## Usage

The app uses `i18next` and `react-i18next` for internationalization.

### In Components

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('home.title')}</h1>
      <p>{t('home.welcome')}</p>
    </div>
  );
};
```

### Change Language

```tsx
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
i18n.changeLanguage('hi'); // Switch to Hindi
i18n.changeLanguage('en'); // Switch to English
```

## Adding New Languages

1. Create a new JSON file (e.g., `ta.json` for Tamil)
2. Copy the structure from `en.json`
3. Translate all strings
4. Import and add to `src/config/i18n.ts`:

```typescript
import ta from '../locales/ta.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta }, // Add new language
};
```

## Translation Keys Structure

```
common.* - Shared UI elements
home.* - Home page strings
dashboard.* - Dashboard page strings
profile.* - Profile page strings
```
