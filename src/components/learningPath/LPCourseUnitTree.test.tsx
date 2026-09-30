import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LPCourseUnitTree from './LPCourseUnitTree';
import type { LPUnitNode } from '../../types/learningPathTypes';

const units: LPUnitNode[] = [
  {
    identifier: 'unit1',
    name: 'Unit 1',
    isUnit: true,
    leafIds: ['leaf1'],
    children: [{ identifier: 'leaf1', name: 'Lesson 1', isUnit: false, leafIds: ['leaf1'], children: [] }],
  },
  { identifier: 'leaf2', name: 'Lesson 2', isUnit: false, leafIds: ['leaf2'], children: [] },
];

describe('LPCourseUnitTree', () => {
  it('renders unit group names and nested leaf names', () => {
    render(<LPCourseUnitTree units={units} onSelectLeaf={vi.fn()} />);
    expect(screen.getByText('Unit 1')).toBeInTheDocument();
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('Lesson 2')).toBeInTheDocument();
  });

  it('calls onSelectLeaf with the leaf id when a leaf is clicked', () => {
    const onSelectLeaf = vi.fn();
    render(<LPCourseUnitTree units={units} onSelectLeaf={onSelectLeaf} />);
    fireEvent.click(screen.getByText('Lesson 2'));
    expect(onSelectLeaf).toHaveBeenCalledWith('leaf2');
  });

  it('marks the active leaf with the active class', () => {
    const { container } = render(<LPCourseUnitTree units={units} activeContentId="leaf2" onSelectLeaf={vi.fn()} />);
    const active = container.querySelector('.lp-unit-tree-leaf--active');
    expect(active).toHaveTextContent('Lesson 2');
  });

  it('marks a completed leaf via contentStatus', () => {
    const { container } = render(
      <LPCourseUnitTree units={units} contentStatus={{ leaf2: 2 }} onSelectLeaf={vi.fn()} />
    );
    const statuses = container.querySelectorAll('.lp-unit-tree-leaf-status');
    expect(statuses[1]).toHaveAttribute('data-complete', 'true');
    expect(statuses[0]).toHaveAttribute('data-complete', 'false');
  });
});
