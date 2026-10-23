import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusTimeline from './StatusTimeline';
import type { LearningPathModel } from '../../../types/learningPathTypes';

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

const model: LearningPathModel = {
  identifier: 'lp1',
  name: 'Path A',
  policy: 'Fixed',
  levels: [
    { identifier: 'l1', name: 'Foundations', index: 0, skills: ['Skill A'], courses: [] },
    { identifier: 'l2', name: 'Advanced', index: 1, skills: ['Skill B'], courses: [] },
  ],
  allSkills: ['Skill A', 'Skill B'],
  courseTotal: 0,
  leafTotal: 0,
};

describe('StatusTimeline', () => {
  it('renders one node per content level', () => {
    render(<StatusTimeline model={model} levelStatuses={['completed', 'locked']} skillSources={[]} selectedSkill={null} t={t} />);
    expect(screen.getByText(/Foundations/)).toBeInTheDocument();
    expect(screen.getByText(/Advanced/)).toBeInTheDocument();
  });

  it('dims a level that does not teach the selected skill', () => {
    const { container } = render(
      <StatusTimeline model={model} levelStatuses={['completed', 'locked']} skillSources={[]} selectedSkill="Skill A" t={t} />
    );
    const nodes = container.querySelectorAll('.lp-status-timeline-node');
    expect(nodes[0]).not.toHaveClass('lp-status-timeline-node--dimmed');
    expect(nodes[1]).toHaveClass('lp-status-timeline-node--dimmed');
  });

  it('does not dim any level when no skill is selected', () => {
    const { container } = render(
      <StatusTimeline model={model} levelStatuses={['completed', 'locked']} skillSources={[]} selectedSkill={null} t={t} />
    );
    expect(container.querySelectorAll('.lp-status-timeline-node--dimmed')).toHaveLength(0);
  });

  it('shows the gained note when the selected skill was gained at this level', () => {
    render(
      <StatusTimeline
        model={model}
        levelStatuses={['completed', 'locked']}
        skillSources={[{ skill: 'Skill A', levelId: 'l1', levelName: 'Foundations', levelIndex: 1, gained: true }]}
        selectedSkill="Skill A"
        t={t}
      />
    );
    expect(screen.getByText('learningPath.skillGainedHere')).toBeInTheDocument();
  });
});
