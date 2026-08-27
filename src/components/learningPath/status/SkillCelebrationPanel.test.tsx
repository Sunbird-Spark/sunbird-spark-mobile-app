import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SkillCelebrationPanel from './SkillCelebrationPanel';

const t = (key: string) => key;

describe('SkillCelebrationPanel', () => {
  it('renders nothing when there are no skills', () => {
    const { container } = render(
      <SkillCelebrationPanel allSkills={[]} gainedSkills={new Set()} selectedSkill={null} onSelectSkill={vi.fn()} t={t} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders every skill as a chip', () => {
    render(
      <SkillCelebrationPanel
        allSkills={['A', 'B']}
        gainedSkills={new Set(['A'])}
        selectedSkill={null}
        onSelectSkill={vi.fn()}
        t={t}
      />
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('selects a skill on click, and deselects it on a second click', () => {
    const onSelectSkill = vi.fn();
    render(
      <SkillCelebrationPanel allSkills={['A']} gainedSkills={new Set()} selectedSkill={null} onSelectSkill={onSelectSkill} t={t} />
    );
    fireEvent.click(screen.getByText('A'));
    expect(onSelectSkill).toHaveBeenCalledWith('A');
  });

  it('deselects the currently-selected skill on click', () => {
    const onSelectSkill = vi.fn();
    render(
      <SkillCelebrationPanel allSkills={['A']} gainedSkills={new Set()} selectedSkill="A" onSelectSkill={onSelectSkill} t={t} />
    );
    fireEvent.click(screen.getByText('A'));
    expect(onSelectSkill).toHaveBeenCalledWith(null);
  });
});
