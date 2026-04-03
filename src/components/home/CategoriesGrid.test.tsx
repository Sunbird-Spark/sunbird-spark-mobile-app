import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { axe } from 'jest-axe';
import { CategoriesGrid } from './CategoriesGrid';

const mockRouterPush = vi.fn();

vi.mock('@ionic/react', () => ({
  IonCard: ({ children, onClick, style, className }: any) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e: any) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(e); }}
      style={style}
      className={className}
    >
      {children}
    </div>
  ),
  useIonRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockCategories = [
  { name: 'Technology', gradient: 'linear-gradient(#111, #222)' },
  { name: 'Business', gradient: 'linear-gradient(#333, #444)' },
  { name: 'Design', gradient: 'linear-gradient(#555, #666)' },
];

describe('CategoriesGrid — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when categories array is empty', () => {
    const { container } = render(<CategoriesGrid categories={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('each category tile has an sr-only span with the category name for screen readers', () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const srOnlySpans = container.querySelectorAll('.sr-only');
    const srOnlyTexts = Array.from(srOnlySpans).map((el) => el.textContent);
    expect(srOnlyTexts).toContain('Technology');
    expect(srOnlyTexts).toContain('Business');
    expect(srOnlyTexts).toContain('Design');
  });

  it('"Browse All" element has role="button"', () => {
    render(<CategoriesGrid categories={mockCategories} />);
    expect(screen.getByRole('button', { name: 'browseAll' })).toBeInTheDocument();
  });

  it('"Browse All" element has tabIndex=0 for keyboard focus', () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const browseAll = container.querySelector('.category-browse-all');
    expect(browseAll).toHaveAttribute('tabindex', '0');
  });

  it('"Browse All" element has aria-label', () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const browseAll = container.querySelector('.category-browse-all');
    expect(browseAll).toHaveAttribute('aria-label', 'browseAll');
  });

  it('"Browse All" navigates on Enter key', () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const browseAll = container.querySelector('.category-browse-all')!;
    fireEvent.keyDown(browseAll, { key: 'Enter' });
    expect(mockRouterPush).toHaveBeenCalledWith('/explore', 'root', 'replace');
  });

  it('"Browse All" navigates on Space key', () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const browseAll = container.querySelector('.category-browse-all')!;
    fireEvent.keyDown(browseAll, { key: ' ' });
    expect(mockRouterPush).toHaveBeenCalledWith('/explore', 'root', 'replace');
  });

  it('"Browse All" does not navigate on other keys', () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const browseAll = container.querySelector('.category-browse-all')!;
    fireEvent.keyDown(browseAll, { key: 'Tab' });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('category tile click navigates to explore', () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const tiles = container.querySelectorAll('.category-tile');
    fireEvent.click(tiles[0]);
    expect(mockRouterPush).toHaveBeenCalledWith('/explore', 'root', 'replace');
  });

  it('has no axe violations', async () => {
    const { container } = render(<CategoriesGrid categories={mockCategories} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
