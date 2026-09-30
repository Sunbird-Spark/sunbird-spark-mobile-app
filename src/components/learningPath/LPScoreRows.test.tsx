import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LPScoreRows from './LPScoreRows';

const t = (key: string) => key;

describe('LPScoreRows', () => {
  it('renders nothing when there are no scores at all', () => {
    const { container } = render(<LPScoreRows t={t} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders only the prior score row when only a prior score exists', () => {
    render(<LPScoreRows priorScore={{ score: 8, maxScore: 10 }} t={t} />);
    expect(screen.getByText('learningPath.priorAssessment')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.queryByText('learningPath.outcomeAssessment')).not.toBeInTheDocument();
  });

  it('renders both rows when both scores exist', () => {
    render(<LPScoreRows priorScore={{ score: 8, maxScore: 10 }} outcomeScore={{ score: 9, maxScore: 10 }} t={t} />);
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('9/10')).toBeInTheDocument();
  });
});
