import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CourseCard from './CourseCard';
import { Course } from '../../data/mockData';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonCard: ({ children, button, onClick, className, style }: any) => (
    <div
      data-testid="ion-card"
      onClick={onClick}
      className={className}
      style={style}
      data-button={button}
    >
      {children}
    </div>
  ),
  IonCardHeader: ({ children, className }: any) => (
    <div data-testid="ion-card-header" className={className}>
      {children}
    </div>
  ),
  IonCardTitle: ({ children, className }: any) => (
    <h3 data-testid="ion-card-title" className={className}>
      {children}
    </h3>
  ),
  IonCardSubtitle: ({ children, className }: any) => (
    <p data-testid="ion-card-subtitle" className={className}>
      {children}
    </p>
  ),
  IonCardContent: ({ children, className }: any) => (
    <div data-testid="ion-card-content" className={className}>
      {children}
    </div>
  ),
  IonProgressBar: ({ value, className }: any) => (
    <div data-testid="ion-progress-bar" data-value={value} className={className} />
  ),
  IonBadge: ({ children, color, className }: any) => (
    <span data-testid="ion-badge" data-color={color} className={className}>
      {children}
    </span>
  ),
  IonImg: ({ src, alt, className }: any) => (
    <img data-testid="ion-img" src={src} alt={alt} className={className} />
  ),
  useIonRouter: () => ({ push: mockPush, goBack: vi.fn(), canGoBack: () => true }),
}));

// Mock router
const mockPush = vi.fn();

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        complete: 'Complete',
        enrolled: 'Enrolled',
        hours: 'hours',
        lessons: 'lessons',
      };
      return translations[key] || key;
    },
  }),
}));

describe('CourseCard', () => {
  const mockCourse: Course = {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    progress: 0,
    instructor: 'Test Instructor',
    duration: '4 weeks',
    thumbnail: '/test-image.jpg',
    rating: 4.5,
    lessons: 12,
    enrolled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default variant', () => {
    it('renders course information correctly', () => {
      render(<CourseCard course={mockCourse} />);
      
      expect(screen.getByText('Test Course')).toBeInTheDocument();
      expect(screen.getByText('Test Instructor')).toBeInTheDocument();
      expect(screen.getByTestId('ion-card')).toBeInTheDocument();
    });

    it('renders course image', () => {
      render(<CourseCard course={mockCourse} />);
      
      const image = screen.getByAltText('Test Course');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });

    it('renders course metadata', () => {
      render(<CourseCard course={mockCourse} />);
      
      expect(screen.getByText(/4 weeks/)).toBeInTheDocument();
      expect(screen.getByText(/12 lessons/)).toBeInTheDocument();
    });

    it('navigates to course detail on click', () => {
      render(<CourseCard course={mockCourse} />);
      
      fireEvent.click(screen.getByTestId('ion-card'));
      expect(mockPush).toHaveBeenCalledWith('/courses/1', 'forward', 'push');
    });

    it('shows enrolled badge when enrolled', () => {
      const enrolledCourse = { ...mockCourse, enrolled: true };
      render(<CourseCard course={enrolledCourse} />);
      
      expect(screen.getByTestId('ion-badge')).toBeInTheDocument();
      expect(screen.getByText('Enrolled')).toBeInTheDocument(); // Changed from 'enrolled' to 'Enrolled'
    });

    it('shows progress bar when enrolled and has progress', () => {
      const courseWithProgress = { 
        ...mockCourse, 
        enrolled: true, 
        progress: 75 
      };
      render(<CourseCard course={courseWithProgress} />);
      
      expect(screen.getByTestId('ion-progress-bar')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Compact variant', () => {
    it('renders in compact format', () => {
      render(<CourseCard course={mockCourse} variant="compact" />);
      
      expect(screen.getByText('Test Course')).toBeInTheDocument();
      expect(screen.getByText('⭐ 4.5')).toBeInTheDocument();
    });

    it('has correct styling classes', () => {
      render(<CourseCard course={mockCourse} variant="compact" />);
      
      const card = screen.getByTestId('ion-card');
      expect(card).toHaveClass('compact-course-card');
    });

    it('renders course image with correct dimensions', () => {
      render(<CourseCard course={mockCourse} variant="compact" />);
      
      const image = screen.getByAltText('Test Course');
      expect(image).toHaveClass('course-image');
    });

    it('uses placeholder image when thumbnail is missing', () => {
      const courseWithoutThumbnail = { ...mockCourse, thumbnail: undefined };
      render(<CourseCard course={courseWithoutThumbnail} variant="compact" />);
      
      const image = screen.getByAltText('Test Course');
      expect(image.getAttribute('src')).toMatch(/\/assets\/placeholders\/placeholder-\d+\.webp/);
    });
  });

  describe('Horizontal variant', () => {
    it('renders in horizontal format', () => {
      render(<CourseCard course={mockCourse} variant="horizontal" />);
      
      expect(screen.getByText('Test Course')).toBeInTheDocument();
      expect(screen.getByText('Test Instructor')).toBeInTheDocument();
    });

    it('has correct styling classes', () => {
      render(<CourseCard course={mockCourse} variant="horizontal" />);
      
      const card = screen.getByTestId('ion-card');
      expect(card).toHaveClass('horizontal-course-card');
    });

    it('shows progress for enrolled courses with progress', () => {
      const courseWithProgress = { 
        ...mockCourse, 
        enrolled: true, 
        progress: 60 
      };
      render(<CourseCard course={courseWithProgress} variant="horizontal" />);
      
      expect(screen.getByTestId('ion-progress-bar')).toBeInTheDocument();
      // Find the specific progress text element
      const progressText = screen.getByText((content, element) => {
        return element?.className === 'progress-text' && element?.textContent === '60% Complete';
      });
      expect(progressText).toBeInTheDocument();
    });

    it('renders horizontal image with correct classes', () => {
      render(<CourseCard course={mockCourse} variant="horizontal" />);
      
      const image = screen.getByAltText('Test Course');
      expect(image).toHaveClass('course-image', 'horizontal');
    });
  });

  describe('Rating display', () => {
    it('shows default rating when not provided', () => {
      const courseWithoutRating = { ...mockCourse, rating: undefined };
      render(<CourseCard course={courseWithoutRating} variant="compact" />);
      
      expect(screen.getByText('⭐ 4.5')).toBeInTheDocument();
    });

    it('shows actual rating when provided', () => {
      const courseWithRating = { ...mockCourse, rating: 3.8 };
      render(<CourseCard course={courseWithRating} variant="compact" />);
      
      expect(screen.getByText('⭐ 3.8')).toBeInTheDocument();
    });
  });

  describe('Progress tracking', () => {
    it('does not show progress for non-enrolled courses', () => {
      const courseWithProgress = { ...mockCourse, progress: 50 };
      render(<CourseCard course={courseWithProgress} />);
      
      expect(screen.queryByTestId('ion-progress-bar')).not.toBeInTheDocument();
    });

    it('does not show progress for enrolled courses with zero progress', () => {
      const enrolledCourse = { ...mockCourse, enrolled: true, progress: 0 };
      render(<CourseCard course={enrolledCourse} />);
      
      expect(screen.queryByTestId('ion-progress-bar')).not.toBeInTheDocument();
    });

    it('shows progress for enrolled courses with progress > 0', () => {
      const courseWithProgress = { 
        ...mockCourse, 
        enrolled: true, 
        progress: 25 
      };
      render(<CourseCard course={courseWithProgress} />);
      
      const progressBar = screen.getByTestId('ion-progress-bar');
      expect(progressBar).toHaveAttribute('data-value', '0.25');
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text for images', () => {
      render(<CourseCard course={mockCourse} />);
      
      const image = screen.getByAltText('Test Course');
      expect(image).toBeInTheDocument();
    });

    it('is clickable and has button behavior', () => {
      render(<CourseCard course={mockCourse} />);
      
      const card = screen.getByTestId('ion-card');
      expect(card).toHaveAttribute('data-button', 'true');
    });
  });
});