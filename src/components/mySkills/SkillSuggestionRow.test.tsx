import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SkillSuggestionRow from './SkillSuggestionRow';
import type { SkillSuggestion } from '../../hooks/useSkillSuggestions';

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

const suggestions: SkillSuggestion[] = [
  { pathId: 'lp1', pathName: 'Path A', contextId: 'ctx1', source: 'enrolled', progressPct: 40, newSkills: ['A', 'B'], totalSkills: 5 },
  { pathId: 'lp2', pathName: 'Path B', source: 'discover', progressPct: 0, newSkills: ['C'], totalSkills: 3 },
];

describe('SkillSuggestionRow', () => {
  it('renders nothing when there are no suggestions', () => {
    const { container } = render(<SkillSuggestionRow suggestions={[]} onSelect={vi.fn()} t={t} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a card per suggestion with its name and new-skill count', () => {
    render(<SkillSuggestionRow suggestions={suggestions} onSelect={vi.fn()} t={t} />);
    expect(screen.getByText('Path A')).toBeInTheDocument();
    expect(screen.getByText('mySkills.newSkillsCount:{"count":2}')).toBeInTheDocument();
    expect(screen.getByText('Path B')).toBeInTheDocument();
  });

  it('shows progress only for enrolled-source suggestions', () => {
    render(<SkillSuggestionRow suggestions={suggestions} onSelect={vi.fn()} t={t} />);
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('calls onSelect with the clicked suggestion', () => {
    const onSelect = vi.fn();
    render(<SkillSuggestionRow suggestions={suggestions} onSelect={onSelect} t={t} />);
    fireEvent.click(screen.getByText('Path A'));
    expect(onSelect).toHaveBeenCalledWith(suggestions[0]);
  });
});
