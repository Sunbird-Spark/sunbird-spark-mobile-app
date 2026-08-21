/**
 * Minimal translate-function type shared by Learning Path presentational
 * components. `react-i18next`'s own `TFunction` type isn't importable in this
 * dependency version (see the same broken import already present in
 * `CollectionAccordion.tsx`) — this local alias covers the interpolation
 * (`t('key', {count})`) usage these components need without depending on it.
 */
export type LPTFunction = (key: string, options?: Record<string, unknown>) => string;
