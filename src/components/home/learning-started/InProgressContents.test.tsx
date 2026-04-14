import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InProgressContents } from './InProgressContents';
import type { TrackableCollection } from '../../../types/collectionTypes';

const mockRouterPush = vi.fn();
vi.mock('@ionic/react', () => ({
  useIonRouter: () => ({ push: mockRouterPush, goBack: vi.fn(), canGoBack: () => true }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const map: Record<string, string> = {
        inProgressCourses: 'In Progress Courses',
        completedCourses: 'Completed Courses',
        course: 'Course',
        untitled: 'untitled',
        'contentBadge.Course': 'Course',
        'contentBadge.Digital Textbook': 'Digital Textbook',
        'contentBadge.Collection': 'Collection',
        'contentBadge.Learning Resource': 'Learning Resource',
      };
      return map[key] || fallback || key;
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('treats status=1 with completionPercentage=100 as completed (API lag scenario)', () => {
    const courses = [
      makeCourse({ courseName: 'Lagged Course', completionPercentage: 100, status: 1 }),
    ];
    render(<InProgressContents courses={courses} />);
    expect(screen.getByText('Completed Courses')).toBeInTheDocument();
  });

  it('does not show status=1 with completionPercentage=100 in in-progress list', () => {
    const courses = [
      makeCourse({ courseName: 'In Progress Real', completionPercentage: 50, status: 1, courseId: 'c1', collectionId: 'col1' }),
      makeCourse({ courseName: 'Lagged Completed', completionPercentage: 100, status: 1, courseId: 'c2', collectionId: 'col2' }),
    ];
    render(<InProgressContents courses={courses} />);
    expect(screen.getByText('In Progress Courses')).toBeInTheDocument();
    expect(screen.getByText('In Progress Real')).toBeInTheDocument();
    expect(screen.queryByText('Lagged Completed')).not.toBeInTheDocument();
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

  it('card has role="button" and tabIndex=0', () => {
    render(<InProgressContents courses={[makeCourse()]} />);
    const card = screen.getAllByRole('button')[0];
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('navigates to collection on card click', () => {
    render(<InProgressContents courses={[makeCourse({ collectionId: 'col-1' })]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockRouterPush).toHaveBeenCalledWith('/collection/col-1', 'forward', 'push');
  });

  it('does not have role="button" when collectionId and courseId are missing', () => {
    const { container } = render(<InProgressContents courses={[makeCourse({ collectionId: undefined, courseId: undefined })]} />);
    expect(container.querySelector('.in-progress__card')).not.toHaveAttribute('role', 'button');
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('navigates on Enter key press', () => {
    render(<InProgressContents courses={[makeCourse({ collectionId: 'col-2' })]} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(mockRouterPush).toHaveBeenCalledWith('/collection/col-2', 'forward', 'push');
  });

  it('navigates on Space key press', () => {
    render(<InProgressContents courses={[makeCourse({ collectionId: 'col-3' })]} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(mockRouterPush).toHaveBeenCalledWith('/collection/col-3', 'forward', 'push');
  });

  it('does not navigate on other key press', () => {
    render(<InProgressContents courses={[makeCourse()]} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not have keyboard handler when collectionId is missing', () => {
    const { container } = render(<InProgressContents courses={[makeCourse({ collectionId: undefined, courseId: undefined })]} />);
    const card = container.querySelector('.in-progress__card')!;
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('uses courseId when collectionId is missing', () => {
    render(<InProgressContents courses={[makeCourse({ collectionId: undefined, courseId: 'course-99' })]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockRouterPush).toHaveBeenCalledWith('/collection/course-99', 'forward', 'push');
  });

  it('treats undefined completionPercentage as 0 (in-progress)', () => {
    const course = makeCourse({ completionPercentage: undefined as any });
    render(<InProgressContents courses={[course]} />);
    expect(screen.getByText('In Progress Courses')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('uses content.name when courseName is missing', () => {
    const course = makeCourse({ courseName: undefined as any, content: { name: 'Content Title' } } as any);
    render(<InProgressContents courses={[course]} />);
    expect(screen.getByText('Content Title')).toBeInTheDocument();
  });

  it('falls back to untitled when both courseName and content.name are missing', () => {
    const course = makeCourse({ courseName: undefined as any } as any);
    render(<InProgressContents courses={[course]} />);
    expect(screen.getByText('untitled')).toBeInTheDocument();
  });

  describe('badge i18n behavior', () => {
    it('renders translated badge for content.primaryCategory "Course"', () => {
      const course = makeCourse({
        content: { primaryCategory: 'Course' } as any,
      });
      render(<InProgressContents courses={[course]} />);
      expect(screen.getByText('Course')).toBeInTheDocument();
    });

    it('renders translated badge for content.primaryCategory "Digital Textbook"', () => {
      const course = makeCourse({
        content: { primaryCategory: 'Digital Textbook' } as any,
      });
      render(<InProgressContents courses={[course]} />);
      expect(screen.getByText('Digital Textbook')).toBeInTheDocument();
    });

    it('renders translated badge for content.primaryCategory "Collection"', () => {
      const course = makeCourse({
        content: { primaryCategory: 'Collection' } as any,
      });
      render(<InProgressContents courses={[course]} />);
      expect(screen.getByText('Collection')).toBeInTheDocument();
    });

    it('renders translated badge for content.primaryCategory "Learning Resource"', () => {
      const course = makeCourse({
        content: { primaryCategory: 'Learning Resource' } as any,
      });
      render(<InProgressContents courses={[course]} />);
      expect(screen.getByText('Learning Resource')).toBeInTheDocument();
    });

    it('falls back to raw primaryCategory value when translation is missing', () => {
      const course = makeCourse({
        content: { primaryCategory: 'Unknown Category' } as any,
      });
      render(<InProgressContents courses={[course]} />);
      expect(screen.getByText('Unknown Category')).toBeInTheDocument();
    });

    it('uses default "Course" when content.primaryCategory is missing', () => {
      const course = makeCourse({
        content: {} as any,
      });
      render(<InProgressContents courses={[course]} />);
      expect(screen.getByText('Course')).toBeInTheDocument();
    });

    it('uses default "Course" when content is undefined', () => {
      const course = makeCourse({
        content: undefined as any,
      });
      render(<InProgressContents courses={[course]} />);
      expect(screen.getByText('Course')).toBeInTheDocument();
    });
  });
});
