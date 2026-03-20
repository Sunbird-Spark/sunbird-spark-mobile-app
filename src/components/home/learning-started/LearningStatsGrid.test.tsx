import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LearningStatsGrid } from './LearningStatsGrid';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        totalCourses: 'Total Courses',
        coursesInProgress: 'Courses in Progress',
        coursesCompleted: 'Courses Completed',
        certificationsEarned: 'Certifications Earned',
      };
      return map[key] || key;
    },
  }),
}));

describe('LearningStatsGrid', () => {
  it('renders all four stat tiles', () => {
    render(
      <LearningStatsGrid
        totalCourses={10}
        coursesInProgress={3}
        coursesCompleted={5}
        certificationsEarned={2}
      />
    );
    expect(screen.getByText('Total Courses')).toBeInTheDocument();
    expect(screen.getByText('Courses in Progress')).toBeInTheDocument();
    expect(screen.getByText('Courses Completed')).toBeInTheDocument();
    expect(screen.getByText('Certifications Earned')).toBeInTheDocument();
  });

  it('displays zero-padded values', () => {
    render(
      <LearningStatsGrid
        totalCourses={3}
        coursesInProgress={1}
        coursesCompleted={2}
        certificationsEarned={0}
      />
    );
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('00')).toBeInTheDocument();
  });

  it('does not zero-pad values >= 10', () => {
    render(
      <LearningStatsGrid
        totalCourses={15}
        coursesInProgress={10}
        coursesCompleted={12}
        certificationsEarned={11}
      />
    );
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });
});
