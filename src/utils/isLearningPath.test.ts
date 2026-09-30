import { describe, expect, it } from 'vitest';
import { isLearningPathCategory } from './isLearningPath';

describe('isLearningPathCategory', () => {
  it('is true for "Learning Path" case-insensitively', () => {
    expect(isLearningPathCategory('Learning Path')).toBe(true);
    expect(isLearningPathCategory('learning path')).toBe(true);
    expect(isLearningPathCategory('LEARNING PATH')).toBe(true);
  });

  it('is false for Course/Collection/undefined', () => {
    expect(isLearningPathCategory('Course')).toBe(false);
    expect(isLearningPathCategory('Collection')).toBe(false);
    expect(isLearningPathCategory(undefined)).toBe(false);
  });
});
