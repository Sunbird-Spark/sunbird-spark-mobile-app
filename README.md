# SunbirdED Mobile App

A mobile application built with Ionic React framework for educational purposes.

## 🚀 Tech Stack

- **React**: 19.2.1
- **TypeScript**: 5.9.3
- **Ionic React**: 8.7.16
- **Vite**: 7.3.1
- **Capacitor**: 7.4.4
- **React Router**: 5.3.4
- **Vitest**: 4.0.16
- **Testing Library**: 16.3.1
- **i18next**: 25.7.4
- **react-i18next**: 16.5.2
- **Tailwind CSS**: 4.1.18

## 📋 Prerequisites

- **Node.js 22.x** (required for Vite 7)
- npm 10.x
- Git

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/sunbird-mobile-app.git
   cd sunbird-mobile-app
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

## 🏃‍♂️ Running the App

### Development Server

Start the development server with hot reload:

```bash
npm run dev
```

The app will be available at `http://localhost:8080` (or next available port).

### Preview Production Build

```bash
npm run build
npm run preview
```

## 🧪 Testing

### Run all tests

```bash
npm test
```

### Watch mode

```bash
npm test
```

### Run tests once

```bash
npm run test:run
```

### Coverage report

```bash
npm run test:coverage
```

### Test UI

```bash
npm run test:ui
```

Test coverage threshold is set to 70% for statements, branches, functions, and lines.

## 🏗️ Building

### Web Build

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

## 📱 Mobile Platforms

### Android

```bash
npx cap sync android
npx cap open android
```

### iOS (macOS only)

```bash
npx cap sync ios
npx cap open ios
```

## 📁 Project Structure

```
src/
├── components/         # Reusable components
│   ├── LanguageSwitcher.tsx
│   └── LanguageSwitcher.test.tsx
├── pages/              # Page components
│   ├── Home.tsx
│   ├── Dashboard.tsx
│   └── Profile.tsx
├── config/             # App configuration
│   └── i18n.ts         # Internationalization setup
├── locales/            # Translation files
│   ├── en.json         # English translations
│   └── hi.json         # Hindi translations
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── types/              # TypeScript type definitions
├── theme/              # Ionic theme variables
│   └── variables.css
├── App.tsx             # Main app component with routing
├── main.tsx            # Application entry point
└── setupTests.ts       # Test configuration

.github/
└── workflows/          # CI/CD workflows
    └── pr-checks.yml   # PR validation workflow

```

## 🌐 Internationalization

The app supports multiple languages using i18next:

- **English** (en) - Default language
- **Hindi** (hi)

Users can switch languages via the language dropdown in the app header. To add more languages:

1. Create a new translation file in `src/locales/` (e.g., `es.json`)
2. Add translations following the existing structure
3. Import and register in `src/config/i18n.ts`

## 🔄 CI/CD

The project includes automated checks on pull requests:

- **Lint Check**: Validates code style and quality
- **Test Suite**: Runs all tests with coverage

## 🤝 Contributing

1. Create a new branch from `develop`

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and ensure:
   - All tests pass (`npm test`)
   - Linting passes (`npm run lint`)
   - Code coverage meets threshold

3. Commit your changes following conventional commits:

   ```bash
   git commit -m "feat: add new feature"
   ```

4. Push and create a Pull Request to `develop`

## 📝 Available Scripts

| Script                  | Description                 |
| ----------------------- | --------------------------- |
| `npm run dev`           | Start development server    |
| `npm run build`         | Build for production        |
| `npm run preview`       | Preview production build    |
| `npm test`              | Run tests in watch mode     |
| `npm run test:run`      | Run tests once              |
| `npm run test:ui`       | Open Vitest UI              |
| `npm run test:coverage` | Generate coverage report    |
| `npm run type-check`    | Type check without emitting |
| `npm run lint`          | Check code quality          |
| `npm run lint:fix`      | Fix linting issues          |

## 🔧 Configuration

- **Vite**: [vite.config.ts](vite.config.ts)
- **TypeScript**: [tsconfig.json](tsconfig.json), [tsconfig.app.json](tsconfig.app.json)
- **Vitest**: [vitest.config.ts](vitest.config.ts)
- **ESLint**: [eslint.config.js](eslint.config.js)
- **PostCSS**: [postcss.config.js](postcss.config.js)
- **Tailwind CSS**: [tailwind.config.ts](tailwind.config.ts)
- **Capacitor**: [capacitor.config.ts](capacitor.config.ts)
- **i18n**: [src/config/i18n.ts](src/config/i18n.ts)

## 📄 License

This project is licensed under the ISC License.

## 👥 Support

For issues and questions, please create an issue in the GitHub repository.
