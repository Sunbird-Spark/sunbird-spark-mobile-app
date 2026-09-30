import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFormRead, i18nState } = vi.hoisted(() => ({
  mockFormRead: vi.fn(),
  i18nState: { language: 'en' },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: i18nState }),
}));

vi.mock('../services/FormService', () => ({
  FormService: class {
    formRead = mockFormRead;
  },
}));

vi.mock('../AppInitializer', () => ({
  AppInitializer: { isInitialized: vi.fn() },
}));

import { useLandingPageConfig } from './useLandingPageConfig';
import { AppInitializer } from '../AppInitializer';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const formResponse = (sections: unknown[]) => ({
  data: { form: { data: { sections } } },
  status: 200,
  headers: {},
});

const render = () => renderHook(() => useLandingPageConfig(), { wrapper: createWrapper() });

describe('useLandingPageConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nState.language = 'en';
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests the landing page form config', async () => {
    mockFormRead.mockResolvedValue(formResponse([]));

    const { result } = render();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFormRead).toHaveBeenCalledWith({
      type: 'page',
      subType: 'landing',
      action: 'sections',
      component: 'app',
      framework: '*',
      rootOrgId: '*',
    });
    expect(result.current.sections).toEqual([]);
  });

  it('sorts sections by index and resolves localized titles', async () => {
    mockFormRead.mockResolvedValue(
      formResponse([
        { index: 2, type: 'banner', title: { en: 'Second', hi: 'दूसरा' } },
        {
          index: 1,
          type: 'categories',
          title: 'First',
          subtitle: { en: 'Sub', hi: 'उप' },
          list: [{ id: 'c1', title: { en: 'Maths', hi: 'गणित' } }],
        },
      ]),
    );

    const { result } = render();

    await waitFor(() => expect(result.current.sections).toHaveLength(2));

    expect(result.current.sections.map((s: { title: string }) => s.title)).toEqual([
      'First',
      'Second',
    ]);
    expect(result.current.sections[0].subtitle).toBe('Sub');
    expect(result.current.sections[0].list).toEqual([{ id: 'c1', title: 'Maths' }]);
    expect(result.current.sections[1].subtitle).toBeUndefined();
  });

  it('resolves labels in the active language', async () => {
    i18nState.language = 'hi';
    mockFormRead.mockResolvedValue(
      formResponse([
        {
          index: 0,
          type: 'categories',
          title: { en: 'Courses', hi: 'पाठ्यक्रम' },
          list: [{ id: 'c1', title: { en: 'Maths', hi: 'गणित' } }],
        },
      ]),
    );

    const { result } = render();

    await waitFor(() => expect(result.current.sections).toHaveLength(1));
    expect(result.current.sections[0].title).toBe('पाठ्यक्रम');
    expect(result.current.sections[0].list[0].title).toBe('गणित');
  });

  it('treats a missing index as 0 when sorting', async () => {
    mockFormRead.mockResolvedValue(
      formResponse([
        { type: 'a', title: 'No index' },
        { index: 5, type: 'b', title: 'Last' },
      ]),
    );

    const { result } = render();

    await waitFor(() => expect(result.current.sections).toHaveLength(2));
    expect(result.current.sections[0].title).toBe('No index');
  });

  it('returns no sections when the payload is not an array', async () => {
    mockFormRead.mockResolvedValue({
      data: { form: { data: { sections: null } } },
      status: 200,
      headers: {},
    });

    const { result } = render();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sections).toEqual([]);
  });

  it('surfaces a form-read error', async () => {
    mockFormRead.mockRejectedValue(new Error('form read failed'));

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.sections).toEqual([]);
  });

  it('waits for AppInitializer before firing the query', async () => {
    vi.useFakeTimers();
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(false);
    mockFormRead.mockResolvedValue(formResponse([{ index: 0, title: 'Ready' }]));

    const { result } = render();

    expect(result.current.isLoading).toBe(true);
    expect(mockFormRead).not.toHaveBeenCalled();

    vi.mocked(AppInitializer.isInitialized).mockReturnValue(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });

    expect(mockFormRead).toHaveBeenCalledTimes(1);
  });
});
