import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContinueLearningCard } from './ContinueLearningCard';
import type { TrackableCollection } from '../../../types/collectionTypes';

const mockPush = vi.fn();
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockPush }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === 'completedPercent') return `Completed: ${opts?.percent}%`;
      if (key === 'continueFromWhereLeft') return 'Continue from where you left';
      if (key === 'continueLearning') return 'Continue Learning';
      return key;
    },
  }),
}));

const makeCourse = (overrides: Partial<TrackableCollection> = {}): TrackableCollection => ({
  batchId: 'batch-1',
  userId: 'user-1',
  courseId: 'course-1',
  collectionId: 'collection-1',
  courseName: 'Test Course',
  completionPercentage: 50,
  enrolledDate: '2025-01-01',
  status: 1,
  ...overrides,
});

describe('ContinueLearningCard', () => {
  it('renders the most recent incomplete course', () => {
    const courses = [
      makeCourse({ courseName: 'Old Course', enrolledDate: '2024-01-01', completionPercentage: 30 }),
      makeCourse({ courseName: 'New Course', enrolledDate: '2025-06-01', completionPercentage: 60, courseId: 'c2', collectionId: 'col2' }),
    ];
    render(<ContinueLearningCard courses={courses} />);
    expect(screen.getByText('New Course')).toBeInTheDocument();
    expect(screen.getByText('Completed: 60%')).toBeInTheDocument();
  });

  it('returns null when all courses are completed', () => {
    const courses = [
      makeCourse({ completionPercentage: 100 }),
    ];
    const { container } = render(<ContinueLearningCard courses={courses} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when courses array is empty', () => {
    const { container } = render(<ContinueLearningCard courses={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders continue learning button', () => {
    render(<ContinueLearningCard courses={[makeCourse()]} />);
    expect(screen.getByText('Continue Learning')).toBeInTheDocument();
  });

  it('renders section heading', () => {
    render(<ContinueLearningCard courses={[makeCourse()]} />);
    expect(screen.getByText('Continue from where you left')).toBeInTheDocument();
  });
});
