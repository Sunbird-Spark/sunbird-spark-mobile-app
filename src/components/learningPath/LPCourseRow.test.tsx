import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LPCourseRow from './LPCourseRow';
import type { LPCourseNode } from '../../types/learningPathTypes';

const t = (key: string) => key;
const course: LPCourseNode = {
  identifier: 'c1',
  name: 'Course 1',
  leafNodesCount: 3,
  leafIds: ['a', 'b', 'c'],
  skills: [],
  isAssessmentCourse: false,
};

describe('LPCourseRow', () => {
  it('renders the course name and real completed/total · pct progress', () => {
    render(<LPCourseRow course={course} status="active" completed={1} total={3} pct={33} t={t} />);
    expect(screen.getByText('Course 1')).toBeInTheDocument();
    expect(screen.getByText('1/3 · 33%')).toBeInTheDocument();
  });

  it('derives completed from pct/total when completed is not explicitly given (back-compat)', () => {
    render(<LPCourseRow course={course} status="active" pct={40} t={t} />);
    // total defaults from course.leafIds.length (3); completed = round(40% of 3) = 1
    expect(screen.getByText('1/3 · 40%')).toBeInTheDocument();
  });

  it('shows the status CTA label — start / resume / revisit', () => {
    const { rerender } = render(<LPCourseRow course={course} status="notStarted" pct={0} t={t} />);
    expect(screen.getByText('learningPath.start')).toBeInTheDocument();

    rerender(<LPCourseRow course={course} status="active" pct={40} t={t} />);
    expect(screen.getByText('learningPath.resume')).toBeInTheDocument();

    rerender(<LPCourseRow course={course} status="completed" pct={100} t={t} />);
    expect(screen.getByText('learningPath.revisit')).toBeInTheDocument();
  });

  it('shows the Optional badge only when isOptional is set, and keeps the row openable', () => {
    const onClick = vi.fn();
    const { rerender } = render(<LPCourseRow course={course} status="active" pct={40} onClick={onClick} t={t} />);
    expect(screen.queryByText('learningPath.optional')).not.toBeInTheDocument();

    rerender(<LPCourseRow course={course} status="active" pct={40} isOptional onClick={onClick} t={t} />);
    expect(screen.getByText('learningPath.optional')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows no CTA label when locked', () => {
    render(<LPCourseRow course={course} status="locked" pct={0} t={t} />);
    expect(screen.queryByText('learningPath.start')).not.toBeInTheDocument();
    expect(screen.queryByText('learningPath.resume')).not.toBeInTheDocument();
    expect(screen.queryByText('learningPath.revisit')).not.toBeInTheDocument();
  });

  it('shows the "Question set only" badge for an assessment course', () => {
    const assessCourse: LPCourseNode = { ...course, isAssessmentCourse: true };
    render(<LPCourseRow course={assessCourse} status="notStarted" pct={0} t={t} />);
    expect(screen.getByText('learningPath.questionSetOnly')).toBeInTheDocument();
  });

  it('does not show the badge for a regular course', () => {
    render(<LPCourseRow course={course} status="notStarted" pct={0} t={t} />);
    expect(screen.queryByText('learningPath.questionSetOnly')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked and not locked', () => {
    const onClick = vi.fn();
    render(<LPCourseRow course={course} status="active" pct={0} onClick={onClick} t={t} />);
    fireEvent.click(screen.getByText('Course 1'));
    expect(onClick).toHaveBeenCalled();
  });

  it('does not call onClick when locked, even on click', () => {
    const onClick = vi.fn();
    render(<LPCourseRow course={course} status="locked" pct={0} onClick={onClick} t={t} />);
    fireEvent.click(screen.getByText('Course 1'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('supports keyboard activation (Enter/Space)', () => {
    const onClick = vi.fn();
    render(<LPCourseRow course={course} status="active" pct={0} onClick={onClick} t={t} />);
    const row = screen.getByRole('button');
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
