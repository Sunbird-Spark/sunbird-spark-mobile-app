import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LPLedger from './LPLedger';
import type { LearningPathModel } from '../../types/learningPathTypes';

vi.mock('@ionic/react', () => ({
  IonAccordionGroup: ({ children }: any) => <div data-testid="accordion-group">{children}</div>,
  IonAccordion: ({ children, disabled, value }: any) => (
    <div data-testid="accordion" data-disabled={disabled} data-value={value}>{children}</div>
  ),
  IonItem: ({ children, className }: any) => <div data-testid="item" className={className}>{children}</div>,
  IonLabel: ({ children }: any) => <div data-testid="label">{children}</div>,
}));

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

const model: LearningPathModel = {
  identifier: 'lp1',
  name: 'Path A',
  policy: 'Fixed',
  priorAssessment: { identifier: 'prior1', name: 'Prior Check', leafNodesCount: 1, leafIds: ['q1'], skills: [], isAssessmentCourse: true },
  outcomeAssessment: { identifier: 'outcome1', name: 'Final Check', leafNodesCount: 1, leafIds: ['q2'], skills: [], isAssessmentCourse: true },
  levels: [
    {
      identifier: 'l1',
      name: 'Foundations',
      index: 0,
      skills: ['Skill A'],
      courses: [
        { identifier: 'c1', name: 'Course 1', leafNodesCount: 2, leafIds: ['r1', 'r2'], skills: ['Skill A'], isAssessmentCourse: false },
      ],
    },
  ],
  allSkills: ['Skill A'],
  courseTotal: 3,
  leafTotal: 4,
};

const baseProps = {
  model,
  levelProgress: [{ pct: 0, completed: 0, total: 2, doneCourses: 0 }],
  levelStatuses: ['notStarted' as const],
  priorProgress: null,
  priorDone: true,
  outcomeProgress: null,
  outcomeUnlocked: false,
  summaryByCollectionId: new Map(),
  pathSummary: undefined,
  onOpenPrior: vi.fn(),
  onOpenOutcome: vi.fn(),
  onOpenLevel: vi.fn(),
  onOpenCourse: vi.fn(),
  t,
};

describe('LPLedger', () => {
  it('renders the prior and outcome assessment gate rows', () => {
    render(<LPLedger {...baseProps} />);
    expect(screen.getByText('Prior Check')).toBeInTheDocument();
    expect(screen.getByText('Final Check')).toBeInTheDocument();
  });

  it('always fires onOpenPrior when the prior row is clicked', () => {
    const onOpenPrior = vi.fn();
    render(<LPLedger {...baseProps} onOpenPrior={onOpenPrior} />);
    fireEvent.click(screen.getByText('Prior Check'));
    expect(onOpenPrior).toHaveBeenCalledTimes(1);
  });

  it('fires onOpenOutcome when the outcome row is clicked and unlocked', () => {
    const onOpenOutcome = vi.fn();
    render(<LPLedger {...baseProps} outcomeUnlocked onOpenOutcome={onOpenOutcome} />);
    fireEvent.click(screen.getByText('Final Check'));
    expect(onOpenOutcome).toHaveBeenCalledTimes(1);
  });

  it('does not fire onOpenOutcome when the outcome row is locked', () => {
    const onOpenOutcome = vi.fn();
    render(<LPLedger {...baseProps} outcomeUnlocked={false} onOpenOutcome={onOpenOutcome} />);
    fireEvent.click(screen.getByText('Final Check'));
    expect(onOpenOutcome).not.toHaveBeenCalled();
    expect(screen.getByText('learningPath.locked')).toBeInTheDocument();
  });

  it('renders one accordion per content level, disabled when locked', () => {
    render(<LPLedger {...baseProps} levelStatuses={['locked']} />);
    const accordions = screen.getAllByTestId('accordion');
    expect(accordions).toHaveLength(1);
    expect(accordions[0]).toHaveAttribute('data-disabled', 'true');
  });

  it("renders each level's courses (via LPCourseRow) and skills, with real per-course progress", () => {
    render(<LPLedger {...baseProps} levelStatuses={['active']} levelProgress={[{ pct: 50, completed: 1, total: 2, doneCourses: 0 }]} />);
    expect(screen.getByText('Course 1')).toBeInTheDocument();
    expect(screen.getByText('Skill A')).toBeInTheDocument();
    // computeCourseProgress on an untouched summary map: 0/2 · 0% (real, not the level's 50% average)
    expect(screen.getByText('0/2 · 0%')).toBeInTheDocument();
  });

  it('fires onOpenCourse with the course id and its first leaf id when a course row is clicked', () => {
    const onOpenCourse = vi.fn();
    render(<LPLedger {...baseProps} levelStatuses={['active']} onOpenCourse={onOpenCourse} />);
    fireEvent.click(screen.getByText('Course 1'));
    expect(onOpenCourse).toHaveBeenCalledWith('c1', 'r1');
  });

  it('fires onOpenLevel with the level id when "Open level detail" is clicked', () => {
    const onOpenLevel = vi.fn();
    render(<LPLedger {...baseProps} levelStatuses={['active']} onOpenLevel={onOpenLevel} />);
    fireEvent.click(screen.getByText('learningPath.openLevelDetail →'));
    expect(onOpenLevel).toHaveBeenCalledWith('l1');
  });

  it('does not render prior/outcome rows when the path has neither', () => {
    const noAssessModel: LearningPathModel = { ...model, priorAssessment: undefined, outcomeAssessment: undefined };
    render(<LPLedger {...baseProps} model={noAssessModel} />);
    expect(screen.queryByText('Prior Check')).not.toBeInTheDocument();
    expect(screen.queryByText('Final Check')).not.toBeInTheDocument();
  });

  it('does not render the outcome row when the model has no outcome assessment even if onOpenOutcome is provided', () => {
    const noOutcomeModel: LearningPathModel = { ...model, outcomeAssessment: undefined };
    render(<LPLedger {...baseProps} model={noOutcomeModel} />);
    expect(screen.queryByText('Final Check')).not.toBeInTheDocument();
  });
});
