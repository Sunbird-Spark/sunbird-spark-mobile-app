import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MySkillsHero from './MySkillsHero';
import type { SkillAggregate } from '../../services/learningPath/skillAggregation';

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

const aggregate: SkillAggregate = {
  totalSkills: 10,
  gainedSkills: 4,
  pendingSkills: 6,
  pathsCompleted: 1,
  pathsOngoing: 2,
};

describe('MySkillsHero', () => {
  it('renders the gained-of-total percentage', () => {
    render(<MySkillsHero aggregate={aggregate} analyzedCount={2} totalCount={3} t={t} />);
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders the gained/pending/completed stat values', () => {
    render(<MySkillsHero aggregate={aggregate} analyzedCount={2} totalCount={3} t={t} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows the "Analyzed X of Y" indicator only when totalCount > 0', () => {
    const { rerender } = render(<MySkillsHero aggregate={aggregate} analyzedCount={2} totalCount={3} t={t} />);
    expect(screen.getByText('mySkills.analyzed:{"analyzed":2,"total":3}')).toBeInTheDocument();

    rerender(<MySkillsHero aggregate={aggregate} analyzedCount={0} totalCount={0} t={t} />);
    expect(screen.queryByText(/mySkills.analyzed/)).not.toBeInTheDocument();
  });

  it('renders 0% when there are no skills at all', () => {
    render(
      <MySkillsHero
        aggregate={{ totalSkills: 0, gainedSkills: 0, pendingSkills: 0, pathsCompleted: 0, pathsOngoing: 0 }}
        analyzedCount={0}
        totalCount={0}
        t={t}
      />
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
