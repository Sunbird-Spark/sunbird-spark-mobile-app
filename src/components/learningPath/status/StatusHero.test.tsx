import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusHero from './StatusHero';

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

describe('StatusHero', () => {
  it('renders the gained/total percentage', () => {
    render(<StatusHero gainedCount={3} totalCount={6} t={t} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders 0% when there are no skills at all', () => {
    render(<StatusHero gainedCount={0} totalCount={0} t={t} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the skills-gained caption', () => {
    render(<StatusHero gainedCount={3} totalCount={6} t={t} />);
    expect(screen.getByText('learningPath.skillsGained:{"gained":3,"total":6}')).toBeInTheDocument();
  });
});
