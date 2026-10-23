import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LPStatusBadge from './LPStatusBadge';
import type { LevelStatusKey } from '../../types/learningPathTypes';

const t = (key: string) => key;

describe('LPStatusBadge', () => {
  const cases: [LevelStatusKey, string][] = [
    ['completed', 'completed'],
    ['active', 'inProgress'],
    ['notStarted', 'notStarted'],
    ['locked', 'learningPath.locked'],
    ['waived', 'learningPath.waived'],
    ['credited', 'learningPath.credited'],
    ['creditedPending', 'learningPath.creditedPending'],
  ];

  it.each(cases)('renders the correct label key for status "%s"', (status, expectedKey) => {
    render(<LPStatusBadge status={status} t={t} />);
    expect(screen.getByText(expectedKey)).toBeInTheDocument();
  });
});
