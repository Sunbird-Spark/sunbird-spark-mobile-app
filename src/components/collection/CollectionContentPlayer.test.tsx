import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CollectionContentPlayer from './CollectionContentPlayer';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonContent: ({ children, scrollY }: any) => <div data-testid="ion-content" data-scroll-y={scrollY}>{children}</div>,
}));

// Mock ScreenOrientation
const mockLock = vi.fn().mockResolvedValue(undefined);
const mockUnlock = vi.fn().mockResolvedValue(undefined);
vi.mock('@capacitor/screen-orientation', () => ({
  ScreenOrientation: {
    lock: (...args: any[]) => mockLock(...args),
    unlock: (...args: any[]) => mockUnlock(...args),
  },
}));

// Mock ContentPlayer
let capturedOnPlayerEvent: ((event: any) => void) | undefined;
vi.mock('../players/ContentPlayer', () => ({
  ContentPlayer: ({ mimeType, metadata, onPlayerEvent, onTelemetryEvent }: any) => {
    capturedOnPlayerEvent = onPlayerEvent;
    return (
      <div data-testid="content-player" data-mimetype={mimeType} data-name={metadata?.name}>
        ContentPlayer
      </div>
    );
  },
}));

// Mock PageLoader
vi.mock('../common/PageLoader', () => ({
  default: ({ message, error, onRetry }: any) => (
    <div data-testid="page-loader" data-message={message} data-error={error}>
      {error && onRetry && (
        <button data-testid="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ),
}));

// Mock hooks
const mockRefetch = vi.fn();
const mockRefetchQuml = vi.fn();

let mockUseContentReadReturn: any = {
  data: null,
  isLoading: true,
  error: null,
  refetch: mockRefetch,
};

let mockUseQumlContentReturn: any = {
  data: null,
  isLoading: false,
  error: null,
  refetch: mockRefetchQuml,
};

vi.mock('../../hooks/useContent', () => ({
  useContentRead: () => mockUseContentReadReturn,
}));

vi.mock('../../hooks/useQumlContent', () => ({
  useQumlContent: () => mockUseQumlContentReturn,
}));

// Mock useContentStateUpdate hook (uses useQueryClient internally)
vi.mock('../../hooks/useContentStateUpdate', () => ({
  useContentStateUpdate: () => vi.fn(),
}));

// Mock CSS import
vi.mock('../../pages/ContentPlayerPage.css', () => ({}));

const mockOnClose = vi.fn();

const defaultContentData = {
  name: 'Test Video',
  mimeType: 'video/mp4',
  appIcon: 'icon.png',
};

const qumlContentData = {
  name: 'Test Quiz',
  mimeType: 'application/vnd.sunbird.questionset',
};

describe('CollectionContentPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnPlayerEvent = undefined;

    mockUseContentReadReturn = {
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    };

    mockUseQumlContentReturn = {
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetchQuml,
    };
  });

  it('locks screen orientation to landscape on mount', () => {
    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
    expect(mockLock).toHaveBeenCalledWith({ orientation: 'landscape' });
  });

  it('unlocks screen orientation on unmount', () => {
    const { unmount } = render(
      <CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />
    );
    unmount();
    expect(mockUnlock).toHaveBeenCalled();
  });

  it('shows loading state while content is loading', () => {
    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
    const loader = screen.getByTestId('page-loader');
    expect(loader).toHaveAttribute('data-message', 'Loading content...');
  });

  it('shows error state when content fails to load', () => {
    mockUseContentReadReturn = {
      data: null,
      isLoading: false,
      error: { message: 'Network error' },
      refetch: mockRefetch,
    };

    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
    const loader = screen.getByTestId('page-loader');
    expect(loader).toHaveAttribute('data-error', 'Failed to load content: Network error');
  });

  it('shows fallback error when no metadata available', () => {
    mockUseContentReadReturn = {
      data: { data: { content: null } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };

    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
    const loader = screen.getByTestId('page-loader');
    expect(loader).toHaveAttribute('data-error', 'No content data available.');
  });

  it('renders ContentPlayer when content is loaded', () => {
    mockUseContentReadReturn = {
      data: { data: { content: defaultContentData } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };

    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
    const player = screen.getByTestId('content-player');
    expect(player).toHaveAttribute('data-mimetype', 'video/mp4');
    expect(player).toHaveAttribute('data-name', 'Test Video');
  });

  it('closes player on EXIT player event', () => {
    mockUseContentReadReturn = {
      data: { data: { content: defaultContentData } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };

    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);

    expect(capturedOnPlayerEvent).toBeDefined();
    act(() => {
      capturedOnPlayerEvent!({
        type: 'unknown',
        data: { type: 'EXIT' },
        playerId: 'do_1',
        timestamp: Date.now(),
      });
    });

    expect(mockUnlock).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close player on non-EXIT player events', () => {
    mockUseContentReadReturn = {
      data: { data: { content: defaultContentData } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };

    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);

    act(() => {
      capturedOnPlayerEvent!({
        type: 'unknown',
        data: { type: 'PLAY' },
      });
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls refetch on retry for regular content', () => {
    mockUseContentReadReturn = {
      data: null,
      isLoading: false,
      error: { message: 'Error' },
      refetch: mockRefetch,
    };

    render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
    fireEvent.click(screen.getByTestId('retry-btn'));

    expect(mockRefetch).toHaveBeenCalled();
  });

  describe('QUML content', () => {
    it('shows loading when both content and QUML are loading', () => {
      mockUseContentReadReturn = {
        data: { data: { content: qumlContentData } },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      };

      mockUseQumlContentReturn = {
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetchQuml,
      };

      render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
      const loader = screen.getByTestId('page-loader');
      expect(loader).toHaveAttribute('data-message', 'Loading content...');
    });

    it('uses QUML data for player metadata when content is QUML type', () => {
      const qumlPlayerData = {
        name: 'QUML Quiz',
        mimeType: 'application/vnd.sunbird.questionset',
      };

      mockUseContentReadReturn = {
        data: { data: { content: qumlContentData } },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      };

      mockUseQumlContentReturn = {
        data: qumlPlayerData,
        isLoading: false,
        error: null,
        refetch: mockRefetchQuml,
      };

      render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
      const player = screen.getByTestId('content-player');
      expect(player).toHaveAttribute('data-name', 'QUML Quiz');
      expect(player).toHaveAttribute('data-mimetype', 'application/vnd.sunbird.questionset');
    });

    it('shows QUML error when QUML fetch fails', () => {
      mockUseContentReadReturn = {
        data: { data: { content: qumlContentData } },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      };

      mockUseQumlContentReturn = {
        data: null,
        isLoading: false,
        error: { message: 'QUML fetch failed' },
        refetch: mockRefetchQuml,
      };

      render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
      const loader = screen.getByTestId('page-loader');
      expect(loader).toHaveAttribute('data-error', 'Failed to load content: QUML fetch failed');
    });

    it('calls both refetch and refetchQuml on retry for QUML content', () => {
      mockUseContentReadReturn = {
        data: { data: { content: qumlContentData } },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      };

      mockUseQumlContentReturn = {
        data: null,
        isLoading: false,
        error: { message: 'Error' },
        refetch: mockRefetchQuml,
      };

      render(<CollectionContentPlayer contentId="do_1" onClose={mockOnClose} />);
      fireEvent.click(screen.getByTestId('retry-btn'));

      expect(mockRefetch).toHaveBeenCalled();
      expect(mockRefetchQuml).toHaveBeenCalled();
    });
  });
});
