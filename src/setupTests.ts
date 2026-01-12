import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Ionic CSS imports
vi.mock('@ionic/react/css/core.css', () => ({}));
vi.mock('@ionic/react/css/normalize.css', () => ({}));
vi.mock('@ionic/react/css/structure.css', () => ({}));
vi.mock('@ionic/react/css/typography.css', () => ({}));
vi.mock('@ionic/react/css/padding.css', () => ({}));
vi.mock('@ionic/react/css/float-elements.css', () => ({}));
vi.mock('@ionic/react/css/text-alignment.css', () => ({}));
vi.mock('@ionic/react/css/text-transformation.css', () => ({}));
vi.mock('@ionic/react/css/flex-utils.css', () => ({}));
vi.mock('@ionic/react/css/display.css', () => ({}));
vi.mock('./theme/variables.css', () => ({}));
vi.mock('./pages/Home.css', () => ({}));

// Global test setup
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
