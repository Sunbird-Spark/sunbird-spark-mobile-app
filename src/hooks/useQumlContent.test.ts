import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockLoadLocal, mockGetHierarchy, mockGetQuestionList } = vi.hoisted(() => ({
  mockLoadLocal: vi.fn(),
  mockGetHierarchy: vi.fn(),
  mockGetQuestionList: vi.fn(),
}));

vi.mock('../services/content/localQumlLoader', () => ({
  loadLocalQumlContent: mockLoadLocal,
}));

vi.mock('../services/QuestionSetService', () => ({
  questionSetService: {
    getHierarchy: mockGetHierarchy,
    getQuestionList: mockGetQuestionList,
  },
}));

vi.mock('../services/UserService', () => ({
  userService: { getUserId: () => 'u1' },
}));

import { useQumlContent } from './useQumlContent';

const dynamicQs = () => ({
  identifier: 'qs_dyn',
  primaryCategory: 'Dynamic QuestionSet',
  difficultyTarget: { E: 1, M: 1, D: 0 },
  children: ['e1', 'e2', 'e3', 'm1', 'm2', 'm3'].map((id) => ({
    identifier: id, objectType: 'Question', mimeType: 'application/vnd.sunbird.question', difficultyLevel: id.startsWith('e') ? 'EASY' : 'MEDIUM', maxScore: 1,
  })),
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useQumlContent', () => {
  it('short-circuits to local content and never calls the API when downloaded', async () => {
    const localMeta = { identifier: 'qs1', name: 'Local QS' };
    mockLoadLocal.mockResolvedValue(localMeta);

    const { result } = renderHook(() => useQumlContent('qs1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(localMeta);
    expect(mockGetHierarchy).not.toHaveBeenCalled();
    expect(mockGetQuestionList).not.toHaveBeenCalled();
  });

  it('falls back to the API when no local content is available', async () => {
    mockLoadLocal.mockResolvedValue(null);
    mockGetHierarchy.mockResolvedValue({
      data: {
        questionset: {
          identifier: 'qs1',
          outcomeDeclaration: { maxScore: { defaultValue: 1 } },
          children: [],
        },
      },
    });

    const { result } = renderHook(() => useQumlContent('qs1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetHierarchy).toHaveBeenCalledWith('qs1');
    expect(result.current.data.identifier).toBe('qs1');
  });

  it("draws the learner's questions from a downloaded Dynamic QuestionSet (positive)", async () => {
    mockLoadLocal.mockResolvedValue(dynamicQs());

    const { result } = renderHook(() => useQumlContent('qs_dyn'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const levels = result.current.data.children.map((c: any) => c.difficultyLevel).sort();
    expect(levels).toEqual(['EASY', 'MEDIUM']);
    expect(result.current.data.maxScore).toBe(2);
  });

  it('draws before question/list online, so only the drawn questions are fetched (positive)', async () => {
    mockLoadLocal.mockResolvedValue(null);
    mockGetHierarchy.mockResolvedValue({ data: { questionset: dynamicQs() } });
    mockGetQuestionList.mockResolvedValue({ data: { questions: [] } });

    const { result } = renderHook(() => useQumlContent('qs_dyn'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const requested: string[] = mockGetQuestionList.mock.calls[0][0];
    expect(requested).toHaveLength(2);
    expect(result.current.data.children.map((c: any) => c.identifier)).toEqual(expect.arrayContaining(requested));
  });

  it('marks an empty Dynamic draw unavailable and fetches no questions, so the player never gets the pool (positive)', async () => {
    mockLoadLocal.mockResolvedValue(null);
    mockGetHierarchy.mockResolvedValue({ data: { questionset: { ...dynamicQs(), difficultyTarget: { E: 0, M: 0, D: 0 } } } });

    const { result } = renderHook(() => useQumlContent('qs_dyn'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.dynamicAssessUnavailable).toBe(true);
    expect(result.current.data.children).toEqual([]);
    expect(mockGetQuestionList).not.toHaveBeenCalled();
  });

  it('leaves a non-Dynamic downloaded QuestionSet whole (negative)', async () => {
    const plain = { ...dynamicQs(), primaryCategory: 'Practice Question Set' };
    mockLoadLocal.mockResolvedValue(plain);

    const { result } = renderHook(() => useQumlContent('qs_dyn'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(plain);
  });

  it('does not run when disabled', () => {
    mockLoadLocal.mockResolvedValue(null);
    renderHook(() => useQumlContent('qs1', { enabled: false }), { wrapper: createWrapper() });
    expect(mockLoadLocal).not.toHaveBeenCalled();
    expect(mockGetHierarchy).not.toHaveBeenCalled();
  });
});
