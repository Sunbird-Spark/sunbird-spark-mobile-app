import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockHttpGet, mockUseSystemSetting, i18nState } = vi.hoisted(() => ({
  mockHttpGet: vi.fn(),
  mockUseSystemSetting: vi.fn(),
  i18nState: { language: 'en' },
}));

vi.mock('@capacitor/core', () => ({
  CapacitorHttp: { get: mockHttpGet },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: i18nState }),
}));

vi.mock('./useSystemSetting', () => ({
  useSystemSetting: mockUseSystemSetting,
}));

import { useFaqData } from './useFaqData';

const FAQ_URL = 'https://cdn.example.com/faq';

const settingQuery = (over: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  ...over,
});

const withValue = (value: string, nested = true) =>
  settingQuery({ data: { data: nested ? { response: { value } } : { value } } });

const RAW_FAQ = {
  categories: [
    {
      name: 'Getting Started',
      faqs: [
        { topic: 'What is {{APP_NAME}}?', description: '<p>A learning app.</p>' },
        { topic: 'How to log in?', description: 'Use your <b>mobile</b> number.' },
      ],
    },
    {
      name: '???',
      faqs: [],
    },
  ],
  general: [
    { title: 'General one', description: '<p>Answer one</p>' },
    { title: '   ', description: 'blank title is dropped' },
    { title: 'no description', description: '  ' },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const render = () => renderHook(() => useFaqData(), { wrapper: createWrapper() });

describe('useFaqData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nState.language = 'en';
    mockUseSystemSetting.mockImplementation((id: string) =>
      id === 'appFaqURL' ? withValue(FAQ_URL) : withValue('Sunbird Spark'),
    );
    mockHttpGet.mockResolvedValue({ data: RAW_FAQ });
  });

  it('fetches the English FAQ file and transforms it', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.faqData).toBeDefined());

    expect(mockHttpGet).toHaveBeenCalledWith({ url: `${FAQ_URL}/faq-en.json` });
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();

    const categories = result.current.faqData!.categories;
    expect(categories).toHaveLength(2);
    expect(categories[0]).toMatchObject({
      title: 'Getting Started',
      slug: 'getting-started',
      faqCount: 2,
    });
    // {{APP_NAME}} substituted from the `sunbird` system setting
    expect(categories[0].faqs[0].question).toBe('What is Sunbird Spark?');
    expect(categories[0].faqs[1].answer).toContain('<b>mobile</b>');
  });

  it('falls back to a generated slug when the category name has no slug characters', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.faqData).toBeDefined());

    expect(result.current.faqData!.categories[1].slug).toBe('category-1');
    expect(result.current.faqData!.categories[1].faqCount).toBe(0);
  });

  it('drops general entries with a blank title or description', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.faqData).toBeDefined());

    const general = result.current.faqData!.general;
    expect(general).toHaveLength(1);
    expect(general[0].title).toBe('General one');
  });

  it('reads the FAQ url from the flat response shape too', async () => {
    mockUseSystemSetting.mockImplementation((id: string) =>
      id === 'appFaqURL' ? withValue(FAQ_URL, false) : settingQuery(),
    );

    const { result } = render();

    await waitFor(() => expect(result.current.faqData).toBeDefined());
    expect(mockHttpGet).toHaveBeenCalledWith({ url: `${FAQ_URL}/faq-en.json` });
    // no app name setting → placeholder left untouched
    expect(result.current.faqData!.categories[0].faqs[0].question).toBe('What is {{APP_NAME}}?');
  });

  it('prefers the language-specific file, using only the base language code', async () => {
    i18nState.language = 'hi-IN';
    const hiFaq = { categories: [{ name: 'Hindi', faqs: [] }] };
    mockHttpGet.mockResolvedValue({ data: hiFaq });

    const { result } = render();

    await waitFor(() => expect(result.current.faqData).toBeDefined());

    expect(mockHttpGet).toHaveBeenCalledWith({ url: `${FAQ_URL}/faq-hi.json` });
    expect(result.current.faqData!.categories[0].title).toBe('Hindi');
    expect(result.current.faqData!.general).toEqual([]);
  });

  it('falls back to English when the language-specific file is missing', async () => {
    i18nState.language = 'hi';
    mockHttpGet
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({ data: RAW_FAQ });

    const { result } = render();

    await waitFor(() => expect(result.current.faqData).toBeDefined());

    expect(mockHttpGet).toHaveBeenNthCalledWith(1, { url: `${FAQ_URL}/faq-hi.json` });
    expect(mockHttpGet).toHaveBeenNthCalledWith(2, { url: `${FAQ_URL}/faq-en.json` });
    expect(result.current.faqData!.categories[0].title).toBe('Getting Started');
  });

  it('sanitizes unsafe markup in answers', async () => {
    mockHttpGet.mockResolvedValue({
      data: {
        categories: [
          {
            name: 'Security',
            faqs: [
              {
                topic: 'XSS?',
                description:
                  '<script>alert(1)</script><b onclick="steal()">bold</b>' +
                  '<a href="javascript:alert(2)">link</a>',
              },
            ],
          },
        ],
      },
    });

    const { result } = render();

    await waitFor(() => expect(result.current.faqData).toBeDefined());

    const answer = result.current.faqData!.categories[0].faqs[0].answer;
    expect(answer).not.toContain('<script');
    expect(answer).not.toContain('onclick');
    expect(answer).not.toContain('javascript:');
    expect(answer).toContain('<b>bold</b>');
    expect(answer).toContain('link');
  });

  it('does not fetch until the FAQ url setting resolves', () => {
    mockUseSystemSetting.mockReturnValue(settingQuery({ isLoading: true }));

    const { result } = render();

    expect(mockHttpGet).not.toHaveBeenCalled();
    expect(result.current.faqData).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces a system-setting error', () => {
    const err = new Error('setting unavailable');
    mockUseSystemSetting.mockReturnValue(settingQuery({ isError: true, error: err }));

    const { result } = render();

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(err);
  });

  it('surfaces a FAQ fetch error', async () => {
    mockHttpGet.mockRejectedValue(new Error('cdn down'));

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('cdn down');
    expect(result.current.faqData).toBeUndefined();
  });
});
