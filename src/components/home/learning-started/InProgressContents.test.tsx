import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InProgressContents } from './InProgressContents';
import type { TrackableCollection } from '../../../types/collectionTypes';

vi.mock('@ionic/react', () => ({
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn(), canGoBack: () => true }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        inProgressCourses: 'In Progress Courses',
        completedCourses: 'Completed Courses',
        course: 'Course',
      };
      return map[key] || key;
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
  status: 1,
  ...overrides,
});

describe('InProgressContents', () => {
  it('renders in-progress courses when available', () => {
    const courses = [
      makeCourse({ courseName: 'Course A', completionPercentage: 30 }),
      makeCourse({ courseName: 'Course B', completionPercentage: 70, courseId: 'c2', collectionId: 'col2' }),
    ];
    render(<InProgressContents courses={courses} />);
    expect(screen.getByText('In Progress Courses')).toBeInTheDocument();
    expect(screen.getByText('Course A')).toBeInTheDocument();
    expect(screen.getByText('Course B')).toBeInTheDocument();
  });

  it('shows completed courses when no in-progress courses exist', () => {
    const courses = [
      makeCourse({ courseName: 'Done Course', completionPercentage: 100, status: 2 }),
    ];
    render(<InProgressContents courses={courses} />);
    expect(screen.getByText('Completed Courses')).toBeInTheDocument();
    expect(screen.getByText('Done Course')).toBeInTheDocument();
  });

  it('returns null when no courses at all', () => {
    const { container } = render(<InProgressContents courses={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows all in-progress courses without slicing', () => {
    const courses = Array.from({ length: 8 }, (_, i) =>
      makeCourse({
        courseName: `Course ${i + 1}`,
        completionPercentage: 10 * (i + 1),
        courseId: `c${i}`,
        collectionId: `col${i}`,
      })
    );
    render(<InProgressContents courses={courses} />);
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`Course ${i}`)).toBeInTheDocument();
    }
  });

  it('does not mix in-progress and completed courses', () => {
    const courses = [
      makeCourse({ courseName: 'In Progress', completionPercentage: 50, courseId: 'c1', collectionId: 'col1' }),
      makeCourse({ courseName: 'Completed', completionPercentage: 100, courseId: 'c2', collectionId: 'col2', status: 2 }),
    ];
    render(<InProgressContents courses={courses} />);
    expect(screen.getByText('In Progress Courses')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<InProgressContents courses={[makeCourse({ completionPercentage: 45 })]} />);
    expect(screen.getByText('45%')).toBeInTheDocument();
  });
});
