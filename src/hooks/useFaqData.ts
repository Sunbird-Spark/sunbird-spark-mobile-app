import { useQuery } from '@tanstack/react-query';
import { CapacitorHttp } from '@capacitor/core';
import { useSystemSetting } from './useSystemSetting';

interface RawFaqItem {
  topic: string;
  description: string;
}

interface RawFaqCategory {
  name: string;
  faqs: RawFaqItem[];
}

interface RawFaqJson {
  categories: RawFaqCategory[];
}

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

export interface FaqData {
  categories: FaqCategory[];
}

export interface UseFaqDataResult {
  faqData: FaqData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

function topicToSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function transformFaqJson(raw: RawFaqJson, appName?: string): FaqData {
  const replaceName = (text: string) =>
    appName ? text.replace(/\{\{APP_NAME\}\}/g, appName) : text;

  return {
    categories: raw.categories.map((group: RawFaqCategory) => ({
      title: replaceName(group.name),
      slug: topicToSlug(group.name),
      faqCount: group.faqs.length,
      faqs: group.faqs.map((item: RawFaqItem) => ({
        question: replaceName(item.topic),
        answer: replaceName(item.description),
      })),
    })),
  };
}

export const useFaqData = (): UseFaqDataResult => {
  const settingQuery = useSystemSetting('appFaqURL');
  const faqUrl: string | undefined = settingQuery.data?.data?.response?.value;

  const appNameQuery = useSystemSetting('sunbird');
  const appName: string | undefined = appNameQuery.data?.data?.response?.value;

  const faqJsonQuery = useQuery<FaqData, Error>({
    queryKey: ['faq-json', faqUrl, appName],
    queryFn: async () => {
      const url = `${faqUrl!}/faq-en.json`;
      const res = await CapacitorHttp.get({ url });
      return transformFaqJson(res.data as RawFaqJson, appName);
    },
    enabled: !!faqUrl,
  });

  return {
    faqData: faqJsonQuery.data,
    isLoading: settingQuery.isLoading || faqJsonQuery.isLoading,
    isError: settingQuery.isError || faqJsonQuery.isError,
    error: settingQuery.error ?? faqJsonQuery.error ?? null,
  };
};
