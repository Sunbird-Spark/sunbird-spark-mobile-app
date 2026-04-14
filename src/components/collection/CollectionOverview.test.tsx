import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CollectionOverview from './CollectionOverview';
import type { CollectionData } from '../../types/collectionTypes';

// Mock icons
vi.mock('../icons/CollectionIcons', () => ({
  CheckIcon: () => <span data-testid="check-icon" />,
  CalendarIcon: () => <span data-testid="calendar-icon" />,
  VideoIcon: () => <span data-testid="video-icon" />,
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'collection.lessons': 'Lessons',
    'collection.courseOverview': 'Course Overview',
    'collection.collectionOverview': 'Collection Overview',
    'collection.units': 'Units',
    'collection.bestSuitedFor': 'Best Suited For',
  };
  return map[key] ?? key;
};

const baseData: CollectionData = {
  id: 'do_123',
  title: 'Test Course Title',
  description: 'A course description',
  lessons: 10,
  units: 3,
  audience: ['Teachers', 'Students'],
  primaryCategory: 'Course',
  children: [],
};

describe('CollectionOverview', () => {
  it('renders the collection title', () => {
    render(<CollectionOverview collectionData={baseData} isCourse={true} t={mockT} />);
    expect(screen.getByText('Test Course Title')).toBeInTheDocument();
  });

  it('renders lessons count in overview section', () => {
    render(<CollectionOverview collectionData={baseData} isCourse={true} t={mockT} />);
    expect(screen.getByText('10 Lessons')).toBeInTheDocument();
  });

  it('renders "Course Overview" heading when isCourse is true', () => {
    render(<CollectionOverview collectionData={baseData} isCourse={true} t={mockT} />);
    expect(screen.getByText('Course Overview')).toBeInTheDocument();
  });

  it('renders "Collection Overview" heading when isCourse is false', () => {
    render(<CollectionOverview collectionData={baseData} isCourse={false} t={mockT} />);
    expect(screen.getByText('Collection Overview')).toBeInTheDocument();
  });

  it('renders units and lessons in overview meta', () => {
    render(<CollectionOverview collectionData={baseData} isCourse={true} t={mockT} />);
    expect(screen.getByText('3 Units')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    expect(screen.getByTestId('video-icon')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(<CollectionOverview collectionData={baseData} isCourse={true} t={mockT} />);
    expect(screen.getByText('A course description')).toBeInTheDocument();
  });

  it('does not render description when absent', () => {
    const data = { ...baseData, description: undefined };
    render(<CollectionOverview collectionData={data} isCourse={true} t={mockT} />);
    expect(screen.queryByText('A course description')).not.toBeInTheDocument();
  });

  it('renders Best Suited For section with audience roles', () => {
    render(<CollectionOverview collectionData={baseData} isCourse={true} t={mockT} />);
    expect(screen.getByText('Best Suited For')).toBeInTheDocument();
    expect(screen.getByText('Teachers')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getAllByTestId('check-icon')).toHaveLength(2);
  });

  it('does not render Best Suited section when audience is empty', () => {
    const data = { ...baseData, audience: [] };
    render(<CollectionOverview collectionData={data} isCourse={true} t={mockT} />);
    expect(screen.queryByText('Best Suited For')).not.toBeInTheDocument();
  });
});
