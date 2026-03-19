import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CollectionAccordion from './CollectionAccordion';
import type { HierarchyContentNode } from '../../types/collectionTypes';

// Mock Ionic components
let accordionGroupValue: string[] = [];
vi.mock('@ionic/react', () => ({
  IonAccordionGroup: ({ children, multiple, value }: any) => {
    accordionGroupValue = value ?? [];
    return <div data-testid="accordion-group">{children}</div>;
  },
  IonAccordion: ({ children, value, className }: any) => {
    const isExpanded = accordionGroupValue.includes(value);
    return (
      <div data-testid={`accordion-${value}`} data-expanded={isExpanded} className={className}>
        {children}
      </div>
    );
  },
  IonItem: ({ children, slot, className }: any) => (
    <div data-testid="ion-item" data-slot={slot} className={className}>{children}</div>
  ),
  IonLabel: ({ children, className }: any) => (
    <div data-testid="ion-label" className={className}>{children}</div>
  ),
  IonModal: ({ children, isOpen, onDidDismiss }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="ion-modal">
        {children}
      </div>
    );
  },
}));

// Mock ionicons
vi.mock('ionicons/icons', () => ({
  chevronDownOutline: 'chevron-down-outline',
}));

// Mock icons
vi.mock('../icons/CollectionIcons', () => ({
  VideoIcon: ({ size }: any) => <span data-testid="video-icon" data-size={size} />,
  DocumentIcon: ({ size }: any) => <span data-testid="document-icon" data-size={size} />,
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
  const mockOnContentPlay = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    accordionGroupValue = [];
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

  it('renders leaf content items within units', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Overview PDF')).toBeInTheDocument();
    expect(screen.getByText('Deep Dive')).toBeInTheDocument();
  });

  it('handles empty children array', () => {
    render(
      <CollectionAccordion children={[]} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    expect(screen.getByText('Course Curriculum')).toBeInTheDocument();
  });

  it('sets first unit as initially expanded', () => {
    render(
      <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
    );
    // accordionGroupValue is set by the mock — first child should be in the value
    expect(accordionGroupValue).toContain('unit-1');
  });

  describe('icon rendering', () => {
    it('shows video icon for video mime types', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      const videoIcons = screen.getAllByTestId('video-icon');
      expect(videoIcons.length).toBeGreaterThan(0);
    });

    it('shows document icon for non-video mime types', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      expect(screen.getByTestId('document-icon')).toBeInTheDocument();
    });

    it('passes size=22 to leaf icons', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      const videoIcons = screen.getAllByTestId('video-icon');
      expect(videoIcons[0]).toHaveAttribute('data-size', '22');
      expect(screen.getByTestId('document-icon')).toHaveAttribute('data-size', '22');
    });
  });

  describe('content play', () => {
    it('calls onContentPlay on leaf click when enrolled', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} onContentPlay={mockOnContentPlay} />
      );
      fireEvent.click(screen.getByText('Introduction'));
      expect(mockOnContentPlay).toHaveBeenCalledWith('leaf-1');
    });

    it('calls onContentPlay on leaf click when unenrolled', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="unenrolled" t={mockT} onContentPlay={mockOnContentPlay} />
      );
      fireEvent.click(screen.getByText('Introduction'));
      expect(mockOnContentPlay).toHaveBeenCalledWith('leaf-1');
    });

    it('does NOT call onContentPlay on leaf click when anonymous — shows login prompt instead', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="anonymous" t={mockT} onContentPlay={mockOnContentPlay} />
      );
      fireEvent.click(screen.getByText('Introduction'));

      expect(mockOnContentPlay).not.toHaveBeenCalled();
      expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
      expect(screen.getByText('Unlock your learning.')).toBeInTheDocument();
    });

    it('shows login button in anonymous login prompt', () => {
      render(
        <CollectionAccordion children={mockChildren} collectionId="do_1" isCourse={true} viewState="anonymous" t={mockT} onContentPlay={mockOnContentPlay} />
      );
      fireEvent.click(screen.getByText('Introduction'));

      expect(screen.getByText('Login')).toBeInTheDocument();
    });
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

    it('renders sub-unit as a section label with nested leaves visible', () => {
      render(
        <CollectionAccordion children={nested} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} />
      );
      // Sub-unit rendered as section title
      expect(screen.getByText('Sub Unit A')).toBeInTheDocument();
      // Direct leaf visible
      expect(screen.getByText('Direct Leaf')).toBeInTheDocument();
      // Deep leaf visible (sub-units are flat sections, not collapsible)
      expect(screen.getByText('Deep Leaf Content')).toBeInTheDocument();
    });

    it('calls onContentPlay for deep leaf content on click', () => {
      render(
        <CollectionAccordion children={nested} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} onContentPlay={mockOnContentPlay} />
      );
      fireEvent.click(screen.getByText('Deep Leaf Content'));
      expect(mockOnContentPlay).toHaveBeenCalledWith('deep-leaf');
    });

    it('calls onContentPlay for direct leaf on click', () => {
      render(
        <CollectionAccordion children={nested} collectionId="do_1" isCourse={true} viewState="enrolled" t={mockT} onContentPlay={mockOnContentPlay} />
      );
      fireEvent.click(screen.getByText('Direct Leaf'));
      expect(mockOnContentPlay).toHaveBeenCalledWith('leaf-direct');
    });
  });
});
