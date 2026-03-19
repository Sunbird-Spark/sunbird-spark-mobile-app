import { useQuery } from '@tanstack/react-query';
import { CapacitorHttp } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { useSystemSetting } from './useSystemSetting';

/* ── Raw JSON shapes ── */

interface RawFaqItem {
  topic: string;
  description: string;
}

interface RawFaqCategory {
  name: string;
  faqs: RawFaqItem[];
}

interface RawGeneralItem {
  title: string;
  description: string;
}

interface RawFaqJson {
  categories: RawFaqCategory[];
  general?: RawGeneralItem[];
}

/* ── Public interfaces ── */

export interface FaqQA {
  question: string;
  answer: string;
}

export interface FaqCategory {
  title: string;
  slug: string;
  faqCount: number;
  faqs: FaqQA[];
}

export interface GeneralFaqItem {
  title: string;
  description: string;
}

export interface FaqData {
  categories: FaqCategory[];
  general: GeneralFaqItem[];
}

export interface UseFaqDataResult {
  faqData: FaqData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/* ── Helpers ── */

function topicToSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Sanitize HTML to prevent XSS. Allows a safe subset of tags and strips
 * event-handler attributes and javascript: hrefs.
 */
function sanitizeHtml(html: string): string {
  const ALLOWED = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'P', 'BR', 'UL', 'OL', 'LI', 'A']);

  function cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    if (!ALLOWED.has(el.tagName)) {
      return document.createTextNode(el.textContent ?? '');
    }

    const clone = document.createElement(el.tagName);
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) return;
      if (attr.name === 'href' && /^javascript:/i.test(attr.value)) return;
      clone.setAttribute(attr.name, attr.value);
    });
    Array.from(node.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) clone.appendChild(cleaned);
    });
    return clone;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const wrapper = document.createElement('div');
    Array.from(doc.body.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) wrapper.appendChild(cleaned);
    });
    return wrapper.innerHTML;
  } catch {
    // If DOMParser is unavailable (e.g. test environment), return as-is.
    return html;
  }
}

function transformFaqJson(raw: RawFaqJson, appName?: string): FaqData {
  const replaceName = (text: string) =>
    appName ? text.replace(/\{\{APP_NAME\}\}/g, appName) : text;

  const categories: FaqCategory[] = (raw.categories ?? []).map((group: RawFaqCategory) => ({
    title: replaceName(group.name),
    slug: topicToSlug(group.name),
    faqCount: group.faqs.length,
    faqs: group.faqs.map((item: RawFaqItem) => ({
      question: replaceName(item.topic),
      answer: sanitizeHtml(replaceName(item.description)),
    })),
  }));

  const general: GeneralFaqItem[] = (raw.general ?? [])
    .filter((item) => item.title?.trim() && item.description?.trim())
    .map((item) => ({
      title: replaceName(item.title),
      description: sanitizeHtml(replaceName(item.description)),
    }));

  return { categories, general };
}

async function fetchFaqJson(url: string, signal?: AbortSignal): Promise<RawFaqJson> {
  // Best-effort abort support: reject immediately if already aborted.
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const res = await CapacitorHttp.get({ url });
  return res.data as RawFaqJson;
}

/* ── Hook ── */

export const useFaqData = (): UseFaqDataResult => {
  const { i18n } = useTranslation();
  const lang = (i18n.language ?? 'en').split('-')[0];

  const settingQuery = useSystemSetting('appFaqURL');
  // Handle both response shapes: response.data.response.value and response.data.value
  const faqUrl: string | undefined =
    settingQuery.data?.data?.response?.value ?? settingQuery.data?.data?.value;

  const appNameQuery = useSystemSetting('sunbird');
  const appName: string | undefined =
    appNameQuery.data?.data?.response?.value ?? appNameQuery.data?.data?.value;

  const faqJsonQuery = useQuery<FaqData, Error>({
    queryKey: ['faq-json', faqUrl, lang, appName],
    queryFn: async ({ signal }) => {
      // Try language-specific file first (skip if already English).
      if (lang !== 'en') {
        try {
          const data = await fetchFaqJson(`${faqUrl!}/faq-${lang}.json`, signal);
          return transformFaqJson(data, appName);
        } catch {
          // Fall through to English fallback.
        }
      }
      const data = await fetchFaqJson(`${faqUrl!}/faq-en.json`, signal);
      return transformFaqJson(data, appName);
    },
    enabled: !!faqUrl,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  });

  return {
    faqData: faqJsonQuery.data,
    isLoading: settingQuery.isLoading || faqJsonQuery.isLoading,
    isError: settingQuery.isError || faqJsonQuery.isError,
    error: settingQuery.error ?? faqJsonQuery.error ?? null,
  };
};
