import { getClient, ApiResponse } from '../lib/http-client';

export class QuestionSetService {
  async getHierarchy<T = any>(questionSetId: string): Promise<ApiResponse<T>> {
    return getClient().get<T>(`/questionset/v2/hierarchy/${questionSetId}`);
  }

  async getQuestionList<T = any>(identifiers: string[]): Promise<ApiResponse<T>> {
    const payload = { request: { search: { identifier: identifiers } } };
    return getClient().post<T>('/question/v2/list', payload);
  }
}

export const questionSetService = new QuestionSetService();
