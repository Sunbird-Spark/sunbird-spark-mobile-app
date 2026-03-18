import sunbirdLogo from '../../assets/sunbird-logo-new.png';
import './PageLoader.css';

interface PageLoaderProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

const PageLoader: React.FC<PageLoaderProps> = ({ message, error = null, onRetry }) => {
  const displayMessage = message || 'Loading...';

  return (
    <div className="page-loader">
      <div className="page-loader-content">
        {/* Logo Container */}
        <div className="page-loader-logo-container">
          {error ? (
            <>
              <div className="page-loader-ring page-loader-ring-error" />
              <div className="page-loader-ring-inner page-loader-ring-inner-error" />
              <div className="page-loader-logo-circle">
                <img src={sunbirdLogo} alt="Error" className="page-loader-logo" />
              </div>
            </>
          ) : (
            <>
              <div className="page-loader-ring page-loader-ring-spin" />
              <div className="page-loader-ring-inner page-loader-ring-pulse" />
              <div className="page-loader-logo-circle">
                <img src={sunbirdLogo} alt="Loading" className="page-loader-logo" />
              </div>
            </>
          )}
        </div>

        {/* Text & Action */}
        <div className="page-loader-text">
          {error ? (
            <>
              <p className="page-loader-error-title">Something went wrong</p>
              <p className="page-loader-error-message">{error}</p>
              {onRetry && (
                <button onClick={onRetry} className="page-loader-retry-btn">
                  Retry
                </button>
              )}
            </>
          ) : (
            <>
              <p className="page-loader-message">{displayMessage}</p>
              <div className="page-loader-dots">
                <span className="page-loader-dot" style={{ animationDelay: '0ms' }} />
                <span className="page-loader-dot" style={{ animationDelay: '150ms' }} />
                <span className="page-loader-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
