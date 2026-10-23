import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LPCertificateCard from './LPCertificateCard';

const t = (key: string) => key;

describe('LPCertificateCard', () => {
  it('shows the locked message when not unlocked', () => {
    render(<LPCertificateCard unlocked={false} t={t} />);
    expect(screen.getByText('learningPath.certificateLocked')).toBeInTheDocument();
    expect(screen.queryByText('learningPath.viewCertificate')).not.toBeInTheDocument();
  });

  it('shows the unlocked message and a view button when a preview URL is present', () => {
    const onView = vi.fn();
    render(<LPCertificateCard unlocked certPreviewUrl="https://example.com/cert.png" onView={onView} t={t} />);
    expect(screen.getByText('learningPath.certificateUnlocked')).toBeInTheDocument();
    fireEvent.click(screen.getByText('learningPath.viewCertificate'));
    expect(onView).toHaveBeenCalled();
  });

  it('does not show the view button when unlocked but no preview URL exists yet', () => {
    render(<LPCertificateCard unlocked t={t} />);
    expect(screen.queryByText('learningPath.viewCertificate')).not.toBeInTheDocument();
  });
});
