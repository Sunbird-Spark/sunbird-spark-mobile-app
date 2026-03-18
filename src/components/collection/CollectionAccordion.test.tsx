import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CollectionAccordion from './CollectionAccordion';
import type { HierarchyContentNode } from '../../types/collectionTypes';

// Mock icons
vi.mock('../icons/CollectionIcons', () => ({
  VideoIcon: ({ size }: any) => <span data-testid="video-icon" data-size={size} />,
  DocumentIcon: ({ size }: any) => <span data-testid="document-icon" data-size={size} />,
  ChevronDownIcon: () => <span data-testid="chevron-down" />,
  ChevronUpIcon: () => <span data-testid="chevron-up" />,
}));

// Mock react-router-dom
const mockPush = vi.fn();
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockPush }),
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'collection.courseCurriculum': 'Course Curriculum',
    'collection.collectionCurriculum': 'Collection Curriculum',
    'collection.untitled': 'Untitled',
  };
  return map[key] ?? key;
};

const mockChildren: HierarchyContentNode[] = [
  {
    identifier: 'unit-1',
    name: 'Week 1: Basics',
    description: 'Foundation topics',
    children: [
      { identifier: 'leaf-1', name: 'Introduction', mimeType: 'video/mp4' },
      { identifier: 'leaf-2', name: 'Overview PDF', mimeType: 'application/pdf' },
    ],
  },
  {
    identifier: 'unit-2',
    name: 'Week 2: Advanced',
    children: [
      { identifier: 'leaf-3', name: 'Deep Dive', mimeType: 'video/webm' },
    ],
  },
];

describe('CollectionAccordion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Course Curriculum" title when isCourse is true', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Course Curriculum')).toBeInTheDocument();
  });

  it('renders "Collection Curriculum" title when isCourse is false', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={false} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Collection Curriculum')).toBeInTheDocument();
  });

  it('renders all unit names', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Week 1: Basics')).toBeInTheDocument();
    expect(screen.getByText('Week 2: Advanced')).toBeInTheDocument();
  });

  it('renders unit description when present', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Foundation topics')).toBeInTheDocument();
  });

  it('renders fallback name when unit name is missing', () => {
    const children: HierarchyContentNode[] = [
      { identifier: 'unit-x', children: [{ identifier: 'leaf-x', name: 'Leaf' }] },
    ];
    render(
      <CollectionAccordion children={children} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Unit 1')).toBeInTheDocument();
  });

  it('shows chevron-down by default (collapsed)', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    const downs = screen.getAllByTestId('chevron-down');
    expect(downs).toHaveLength(2);
    expect(screen.queryByTestId('chevron-up')).not.toBeInTheDocument();
  });

  it('does not show leaf items when collapsed', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.queryByText('Introduction')).not.toBeInTheDocument();
  });

  describe('expanding/collapsing', () => {
    it('expands a unit on click and shows leaf items', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));

      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Overview PDF')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-up')).toBeInTheDocument();
    });

    it('collapses a unit on second click', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));
      expect(screen.getByText('Introduction')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Week 1: Basics'));
      expect(screen.queryByText('Introduction')).not.toBeInTheDocument();
    });
  });

  describe('icon rendering', () => {
    it('shows video icon for video mime types', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));
      expect(screen.getByTestId('video-icon')).toBeInTheDocument();
    });

    it('shows document icon for non-video mime types', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));
      expect(screen.getByTestId('document-icon')).toBeInTheDocument();
    });

    it('passes size=22 to leaf icons', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));
      expect(screen.getByTestId('video-icon')).toHaveAttribute('data-size', '22');
      expect(screen.getByTestId('document-icon')).toHaveAttribute('data-size', '22');
    });
  });

  describe('navigation', () => {
    it('navigates to content page on leaf click when enrolled', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));
      fireEvent.click(screen.getByText('Introduction'));

      expect(mockPush).toHaveBeenCalledWith('/collection/do_1/content/leaf-1');
    });

    it('navigates on leaf click when unenrolled', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="unenrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));
      fireEvent.click(screen.getByText('Introduction'));

      expect(mockPush).toHaveBeenCalledWith('/collection/do_1/content/leaf-1');
    });

    it('does NOT navigate on leaf click when anonymous', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="anonymous" t={mockT} />
      );
      fireEvent.click(screen.getByText('Week 1: Basics'));
      fireEvent.click(screen.getByText('Introduction'));

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('handles empty children array', () => {
    render(
      <CollectionAccordion children={[]} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Course Curriculum')).toBeInTheDocument();
  });

  describe('multi-level nesting', () => {
    const nested: HierarchyContentNode[] = [
      {
        identifier: 'unit-1',
        name: 'Unit 1',
        mimeType: 'application/vnd.ekstep.content-collection',
        children: [
          {
            identifier: 'sub-1',
            name: 'Sub Unit A',
            mimeType: 'application/vnd.ekstep.content-collection',
            children: [
              { identifier: 'deep-leaf', name: 'Deep Leaf Content', mimeType: 'application/pdf' },
            ],
          },
          { identifier: 'leaf-direct', name: 'Direct Leaf', mimeType: 'video/mp4' },
        ],
      },
    ];

    it('shows sub-unit as collapsible section when parent is expanded', () => {
      render(
        <CollectionAccordion children={nested} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Unit 1'));

      // Sub-unit shows as a collapsible header, not a leaf
      expect(screen.getByText('Sub Unit A')).toBeInTheDocument();
      // Direct leaf is visible
      expect(screen.getByText('Direct Leaf')).toBeInTheDocument();
      // Deep leaf is NOT visible until sub-unit is expanded
      expect(screen.queryByText('Deep Leaf Content')).not.toBeInTheDocument();
    });

    it('expands sub-unit to show deeply nested leaves', () => {
      render(
        <CollectionAccordion children={nested} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      // Expand top-level unit
      fireEvent.click(screen.getByText('Unit 1'));
      // Expand sub-unit
      fireEvent.click(screen.getByText('Sub Unit A'));

      expect(screen.getByText('Deep Leaf Content')).toBeInTheDocument();
    });

    it('collapses sub-unit independently of parent', () => {
      render(
        <CollectionAccordion children={nested} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Unit 1'));
      fireEvent.click(screen.getByText('Sub Unit A'));
      expect(screen.getByText('Deep Leaf Content')).toBeInTheDocument();

      // Collapse sub-unit
      fireEvent.click(screen.getByText('Sub Unit A'));
      expect(screen.queryByText('Deep Leaf Content')).not.toBeInTheDocument();
      // Parent still expanded
      expect(screen.getByText('Direct Leaf')).toBeInTheDocument();
    });

    it('navigates to deep leaf content on click', () => {
      render(
        <CollectionAccordion children={nested} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      fireEvent.click(screen.getByText('Unit 1'));
      fireEvent.click(screen.getByText('Sub Unit A'));
      fireEvent.click(screen.getByText('Deep Leaf Content'));

      expect(mockPush).toHaveBeenCalledWith('/collection/do_1/content/deep-leaf');
    });
  });
});
