import { describe, expect, it } from 'vitest';
import { getContentDetailPath, getLearningPathStatusPath } from './getContentDetailPath';

describe('getContentDetailPath', () => {
  it('routes a Learning Path to /learning-path/:id', () => {
    expect(getContentDetailPath('lp1', 'Learning Path')).toBe('/learning-path/lp1');
  });

  it('routes everything else to /collection/:id', () => {
    expect(getContentDetailPath('c1', 'Course')).toBe('/collection/c1');
    expect(getContentDetailPath('c1', undefined)).toBe('/collection/c1');
  });

  it('appends /batch/:batchId when a batchId is given', () => {
    expect(getContentDetailPath('lp1', 'Learning Path', 'ctx1')).toBe('/learning-path/lp1/batch/ctx1');
    expect(getContentDetailPath('c1', 'Course', 'batch1')).toBe('/collection/c1/batch/batch1');
  });
});

describe('getLearningPathStatusPath', () => {
  it('builds the plain status path with no contextId', () => {
    expect(getLearningPathStatusPath('lp1')).toBe('/learning-path/lp1/status');
  });

  it('builds the batch-scoped status path with a contextId', () => {
    expect(getLearningPathStatusPath('lp1', 'ctx1')).toBe('/learning-path/lp1/batch/ctx1/status');
  });
});
