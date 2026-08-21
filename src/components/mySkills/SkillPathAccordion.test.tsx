import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SkillPathAccordion from './SkillPathAccordion';
import type { PathSkillSummary } from '../../services/learningPath/skillAggregation';

vi.mock('@ionic/react', () => ({
  IonAccordionGroup: ({ children }: any) => <div data-testid="accordion-group">{children}</div>,
  IonAccordion: ({ children }: any) => <div data-testid="accordion">{children}</div>,
  IonItem: ({ children }: any) => <div data-testid="item">{children}</div>,
  IonLabel: ({ children }: any) => <div data-testid="label">{children}</div>,
}));

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

const summaries: PathSkillSummary[] = [
  {
    pathId: 'lp1',
    pathName: 'Path A',
    progressPct: 50,
    status: 'ongoing',
    allSkills: ['A', 'B'],
    gainedSkills: new Set(['A']),
    gainedCount: 1,
    pendingCount: 1,
    skillSources: [],
  },
];

describe('SkillPathAccordion', () => {
  it('renders nothing when there are no summaries', () => {
    const { container } = render(<SkillPathAccordion summaries={[]} onOpenPath={vi.fn()} t={t} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the path name, status and skill chips', () => {
    render(<SkillPathAccordion summaries={summaries} onOpenPath={vi.fn()} t={t} />);
    expect(screen.getByText('Path A')).toBeInTheDocument();
    expect(screen.getByText('inProgress')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('calls onOpenPath with the summary when "View path" is clicked', () => {
    const onOpenPath = vi.fn();
    render(<SkillPathAccordion summaries={summaries} onOpenPath={onOpenPath} t={t} />);
    fireEvent.click(screen.getByText('mySkills.viewPath'));
    expect(onOpenPath).toHaveBeenCalledWith(summaries[0]);
  });
});
