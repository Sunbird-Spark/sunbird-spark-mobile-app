import { describe, it, expect } from 'vitest';
import { resolveLabel } from './formLocaleResolver';

describe('resolveLabel', () => {
  it('returns string value as-is', () => {
    expect(resolveLabel('Hello', 'en')).toBe('Hello');
  });

  it('returns matching language from locale map', () => {
    expect(resolveLabel({ en: 'Hello', fr: 'Bonjour' }, 'fr')).toBe('Bonjour');
  });

  it('falls back to "en" when lang not in map', () => {
    expect(resolveLabel({ en: 'Hello', fr: 'Bonjour' }, 'ar')).toBe('Hello');
  });

  it('falls back to first value when lang and "en" are not in map', () => {
    expect(resolveLabel({ fr: 'Bonjour', hi: 'नमस्ते' }, 'ar')).toBe('Bonjour');
  });

  it('returns empty string when map is empty', () => {
    expect(resolveLabel({}, 'en')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(resolveLabel(null, 'en')).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(resolveLabel(undefined, 'en')).toBe('');
  });

  it('returns empty string for number', () => {
    expect(resolveLabel(42, 'en')).toBe('');
  });
});
