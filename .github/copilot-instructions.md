# Sahayak Mobile App - Coding Instructions

## Project Overview
**Sahayak** is a hybrid mobile application built with Ionic Framework and Capacitor, enabling cross-platform deployment (Android/iOS) from a single React codebase.

## Technology Stack
- **Framework**: Ionic React 8.7.16, React 19.2.1
- **Language**: TypeScript 5.9.3
- **Build Tools**: Vite 7.3.1, Capacitor 7.4.4
- **Testing**: Jest 30.2.0, React Testing Library 16.3.1
- **Styling**: Ionic CSS Components + Tailwind CSS 4.1.18
- **Routing**: Ionic React Router (based on React Router 5.3.4)
- **Icons**: Ionicons 7.4.0
- **Code Quality**: ESLint, Prettier 3.7.4

## Language Guidelines

### TypeScript Requirements
- **Use TypeScript for all files** - .tsx for components, .ts for utilities
- **Type all props** using interfaces or types
- **Avoid `any` type** - use `unknown` and type guards when needed
- **Current config is permissive** (strictNullChecks: false) - gradually improve typing
- **Prefer explicit return types** for functions and hooks
- **Use Capacitor types** for plugin interfaces (`@capacitor/core`)

### Type Safety Best Practices
```typescript
// Good: Explicit types for props and state
interface HomeProps {
  userId: string;
  onNavigate: (path: string) => void;
}

// Good: Type guards for runtime checks
function isValidResponse(data: unknown): data is ApiResponse {
  return typeof data === 'object' && data !== null && 'status' in data;
}
```

## Ionic Framework Guidelines

### Component Usage
- **Always use Ionic components** for UI elements (`IonButton`, `IonCard`, `IonList`, etc.)
- **Import from `@ionic/react`** not HTML elements
- **Call `setupIonicReact()`** in App.tsx before rendering
- **Use Ionic CSS utilities** for spacing and layout
- **Wrap app in `<IonApp>`** component

### Required Ionic CSS Imports
```typescript
import '@ionic/react/css/core.css';           // Required
import '@ionic/react/css/normalize.css';      // Base styles
import '@ionic/react/css/structure.css';      // Layout
import '@ionic/react/css/typography.css';     // Text styles
```

### Ionic Component Patterns
```typescript
// Pages must use IonPage wrapper
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

const MyPage: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Page Title</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      {/* Page content */}
    </IonContent>
  </IonPage>
);
```

## Styling Guidelines

### CSS Strategy
- **Primary**: Ionic CSS Components with built-in theming
- **Secondary**: Tailwind CSS for custom styling
- **CSS Variables**: Use Ionic CSS variables in `src/theme/variables.css`
- **Responsive**: Ionic handles mobile breakpoints automatically
- **Dark Mode**: Support via Ionic's color mode system

### Styling Priority
1. Ionic component props (`color`, `fill`, `size`)
2. Ionic CSS utility classes (`ion-padding`, `ion-text-center`)
3. Tailwind classes for custom layouts
4. Custom CSS in component-specific files

### Color System
```typescript
// Use Ionic color variants
<IonButton color="primary">Primary</IonButton>
<IonButton color="secondary">Secondary</IonButton>
<IonButton color="success">Success</IonButton>
<IonButton color="warning">Warning</IonButton>
<IonButton color="danger">Danger</IonButton>
```

## React Guidelines

### Component Structure
- **Use functional components** with hooks exclusively
- **TypeScript interfaces** for all props and state
- **Default exports** for page components in `src/pages/`
- **Named exports** for utilities, hooks, and shared components
- **Co-locate tests** with components (`ComponentName.test.tsx`)

### File Organization
```
src/
├── pages/           # Route components (default export)
├── components/      # Reusable components (named export)
├── hooks/           # Custom React hooks
├── services/        # API and business logic
├── utils/           # Helper functions
├── types/           # TypeScript type definitions
└── theme/           # CSS variables and global styles
```

### Component Best Practices
```typescript
// Good: Typed props, functional component
interface ProfileProps {
  userId: string;
  onUpdate: (data: ProfileData) => void;
}

const Profile: React.FC<ProfileProps> = ({ userId, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  
  return (
    <IonPage>
      {/* Component JSX */}
    </IonPage>
  );
};

export default Profile;
```

## Routing

### Ionic React Router
- **Use `IonReactRouter`** instead of `BrowserRouter`
- **Use `IonRouterOutlet`** for route transitions
- **Tab Navigation**: `IonTabs`, `IonTabBar`, `IonTabButton`
- **Route Components**: Wrap in `<Route>` from `react-router-dom`

### Router Setup Pattern
```typescript
import { IonReactRouter } from '@ionic/react-router';
import { IonTabs, IonRouterOutlet, IonTabBar } from '@ionic/react';

<IonReactRouter>
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/home" component={Home} />
      <Route exact path="/dashboard" component={Dashboard} />
      <Route exact path="/profile" component={Profile} />
      <Redirect exact from="/" to="/home" />
    </IonRouterOutlet>
    <IonTabBar slot="bottom">
      {/* Tab buttons */}
    </IonTabBar>
  </IonTabs>
</IonReactRouter>
```

## State Management

### Local State
- **useState** for simple component state
- **useReducer** for complex state logic
- **useRef** for DOM references and mutable values
- **useEffect** for side effects and lifecycle

### Server State
- **Always use `@capacitor/core` HTTP plugin** for API calls
- **Handle loading, error, and success states**
- **Create custom hooks** for data fetching patterns

### Capacitor HTTP Example
```typescript
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

async function fetchUserData(userId: string): Promise<UserData> {
  const options = {
    url: `https://api.example.com/users/${userId}`,
    headers: { 'Content-Type': 'application/json' },
  };
  
  const response: HttpResponse = await CapacitorHttp.get(options);
  
  if (response.status === 200) {
    return response.data as UserData;
  }
  
  throw new Error(`API error: ${response.status}`);
}
```

## Capacitor Native Features

### Plugin Usage
- **Import from `@capacitor/core`** or specific plugin packages
- **Check platform** before calling native APIs
- **Handle errors gracefully** - not all features work on web
- **Use Preferences** for local storage (`@capacitor/preferences`)
- **Safe Area** plugin installed for notch/status bar handling

### Available Plugins
- `@capacitor/core` - HTTP, Device, App, Network
- `@capacitor/preferences` - Key-value storage
- `capacitor-plugin-safe-area` - Screen insets

### Platform Detection
```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Native code (Android/iOS)
} else {
  // Web fallback
}

const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
```

## Testing Guidelines

### Test Files
- **Co-locate tests** with components: `Component.test.tsx`
- **Test user interactions** not implementation details
- **Use React Testing Library** patterns
- **Mock Capacitor plugins** in tests

### Testing Patterns
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
  
  it('handles user interaction', () => {
    render(<MyComponent />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Test Commands
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

## Mobile-Specific Best Practices

### Performance
- **Lazy load routes** with React.lazy()
- **Optimize images** for mobile resolutions
- **Minimize bundle size** - check dependencies
- **Use virtual scrolling** for long lists (`IonVirtualScroll`)

### UX Considerations
- **Touch targets** minimum 44x44 pixels
- **Loading states** for all async operations
- **Offline support** using Capacitor Network API
- **Pull-to-refresh** with `IonRefresher`
- **Native navigation** feel with Ionic transitions

### Accessibility
- **WCAG 2.1 AA compliance** minimum
- **Use semantic HTML** within Ionic components
- **ARIA labels** for icon-only buttons
- **Keyboard navigation** (desktop browser testing)
- **Screen reader testing** on actual devices

## Build & Development

### Development Commands
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix lint issues
npm run type-check       # TypeScript type checking
```

### Capacitor Commands
```bash
npx cap sync             # Sync web assets to native projects
npx cap open android     # Open Android Studio
npx cap open ios         # Open Xcode
npx cap run android      # Run on Android device/emulator
npx cap run ios          # Run on iOS device/simulator
```

## Code Quality Standards

### ESLint & Prettier
- **Run ESLint** before commits
- **Format with Prettier** for consistency
- **Fix lint errors** not warnings as minimum
- **Use consistent imports** - alphabetize when possible

### Git Commit Guidelines
- **Use conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- **Write clear messages** explaining the "why"
- **Small, focused commits** over large changes
- **Test before committing**

## Common Patterns

### Loading State Pattern
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType | null>(null);

useEffect(() => {
  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }
  loadData();
}, []);
```

### Error Boundary Pattern
```typescript
import { IonContent, IonPage } from '@ionic/react';

class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <IonPage>
          <IonContent className="ion-padding">
            <h1>Something went wrong</h1>
          </IonContent>
        </IonPage>
      );
    }
    return this.props.children;
  }
}
```

## Important Reminders

- ✅ **Always use Ionic components** - don't use plain HTML buttons/inputs
- ✅ **Setup Ionic** with `setupIonicReact()` before app renders
- ✅ **Use Capacitor HTTP** for all network requests
- ✅ **Test on real devices** - emulators don't catch all issues
- ✅ **Wrap pages in IonPage** - required for proper transitions
- ✅ **Use IonReactRouter** - not BrowserRouter
- ✅ **Type your components** - interfaces for all props
- ✅ **Co-locate tests** - keep tests next to components
- ✅ **Handle loading states** - improve perceived performance
- ✅ **Support both platforms** - test Android and iOS