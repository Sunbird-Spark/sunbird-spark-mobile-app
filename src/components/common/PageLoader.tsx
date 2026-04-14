import { ASSETS } from '../../constants/assets';
import './PageLoader.css';
import { useTranslation } from 'react-i18next';

interface PageLoaderProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

const PageLoader: React.FC<PageLoaderProps> = ({ message, error = null, onRetry }) => {
  const { t } = useTranslation();
  const displayMessage = message || t('loading');

  return (
    <div
      className="page-loader"
      role={error ? 'alert' : 'status'}
      aria-label={error ? t('pageLoader.somethingWentWrong') : displayMessage}
    >
      <div className="page-loader-content">
        {/* Logo Container */}
        <div className="page-loader-logo-container" aria-hidden="true">
          {error ? (
            <>
              <div className="page-loader-ring page-loader-ring-error" />
              <div className="page-loader-ring-inner page-loader-ring-inner-error" />
              <div className="page-loader-logo-circle">
                <img src={ASSETS.SUNBIRD_LOGO} alt="" className="page-loader-logo" />
              </div>
            </>
          ) : (
            <>
              <div className="page-loader-ring page-loader-ring-spin" />
              <div className="page-loader-ring-inner page-loader-ring-pulse" />
              <div className="page-loader-logo-circle">
                <img src={ASSETS.SUNBIRD_LOGO} alt="" className="page-loader-logo" />
              </div>
            </>
          )}
        </div>

        {/* Text & Action */}
        <div className="page-loader-text">
          {error ? (
            <>
              <p className="page-loader-error-title">{t('pageLoader.somethingWentWrong')}</p>
              <p className="page-loader-error-message">{error}</p>
              {onRetry && (
                <button onClick={onRetry} className="page-loader-retry-btn" aria-label={t('retry')}>
                  {t('retry')}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="page-loader-message">{displayMessage}</p>
              <div className="page-loader-dots" aria-hidden="true">
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
