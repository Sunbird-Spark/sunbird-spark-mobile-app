import { ASSETS } from '../../constants/assets';
import './PageLoader.css';
import { useTranslation } from 'react-i18next';
import { DissolveLoader } from './DissolveLoader';

interface PageLoaderProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  fullPage?: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({ message, error = null, onRetry, fullPage = true }) => {
  const { t } = useTranslation();
  const displayMessage = message || t('loading');

  const wrapperClass = fullPage
    ? 'page-loader'
    : 'page-loader page-loader--inline';

  return (
    <div
      className={wrapperClass}
      role={error ? 'alert' : 'status'}
      aria-label={error ? t('pageLoader.somethingWentWrong') : displayMessage}
    >
      {!error ? (
        <DissolveLoader message={displayMessage} />
      ) : (
        <div className="page-loader-content">
          <div className="page-loader-logo-container" aria-hidden="true">
            <div className="page-loader-ring page-loader-ring-error" />
            <div className="page-loader-ring-inner page-loader-ring-inner-error" />
            <div className="page-loader-logo-circle">
              <img src={ASSETS.SUNBIRD_LOGO} alt="" className="page-loader-logo" />
            </div>
          </div>
          <div className="page-loader-text">
            <p className="page-loader-error-title">{t('pageLoader.somethingWentWrong')}</p>
            <p className="page-loader-error-message">{error}</p>
            {onRetry && (
              <button onClick={onRetry} className="page-loader-retry-btn" aria-label={t('retry')}>
                {t('retry')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageLoader;
