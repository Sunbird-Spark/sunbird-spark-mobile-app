/**
 * Resolves a form label that can be either a plain string or a locale object.
 *
 * - string  → returned as-is
 * - object  → picks current language, falls back to "en", then first available value
 *
 * Examples:
 *   resolveLabel("Hello", "fr")                        → "Hello"
 *   resolveLabel({ en: "Hello", fr: "Bonjour" }, "fr") → "Bonjour"
 *   resolveLabel({ en: "Hello", fr: "Bonjour" }, "ar") → "Hello"  (fallback to en)
 */
export function resolveLabel(value: unknown, lang: string): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const map = value as Record<string, string>;
    return map[lang] || map['en'] || Object.values(map)[0] || '';
  }
  return '';
}
