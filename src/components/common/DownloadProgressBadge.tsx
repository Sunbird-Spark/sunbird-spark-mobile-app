import React from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  downloadOutline,
  alertCircleOutline,
  pause,
  play,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import type { DownloadProgress } from '../../services/download_manager/types';
import './DownloadProgressBadge.css';

interface DownloadProgressBadgeProps {
  downloadState: DownloadProgress | null;
  isLocal: boolean;
  onDownload: () => void;
  onRetry: () => void;
  onDelete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export const DownloadProgressBadge: React.FC<DownloadProgressBadgeProps> = ({
  downloadState,
  isLocal,
  onDownload,
  onRetry,
  onDelete,
  onPause,
  onResume,
}) => {
  const { t } = useTranslation();

  // Priority: isLocal > downloadState > default
  if (isLocal) {
    return (
      <button className="dpb-btn dpb-delete" onClick={onDelete} aria-label={t('download.delete', 'Delete')} title={t('download.delete', 'Delete')}>
        <IonIcon icon={trashOutline} />
      </button>
    );
  }

  if (!downloadState) {
    return (
      <button className="dpb-btn dpb-available" onClick={onDownload} aria-label={t('download.download', 'Download')} title={t('download.download', 'Download')}>
        <IonIcon icon={downloadOutline} />
      </button>
    );
  }

  switch (downloadState.state) {
    case 'QUEUED':
    case 'RETRY_WAIT':
      return (
        <span className="dpb-btn dpb-queued" aria-label={t('download.queued', 'Queued')} title={t('download.queued', 'Queued')}>
          <IonIcon icon={timeOutline} />
        </span>
      );

    case 'DOWNLOADING':
    case 'PAUSED': {
      const pct = Math.round(downloadState.progress);
      const r = 10;
      const circ = 2 * Math.PI * r;
      const offset = circ - (pct / 100) * circ;
      const isPaused = downloadState.state === 'PAUSED';

      const label = isPaused
        ? t('download.resume', 'Resume downloading')
        : t('download.downloading', 'Downloading {{pct}}%', { pct });

      return (
        <button
          className={isPaused ? 'dpb-btn dpb-paused' : 'dpb-btn dpb-downloading'}
          onClick={isPaused ? onResume : onPause}
          aria-label={label}
          title={label}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" className="dpb-ring">
            <circle cx="13" cy="13" r={r} fill="none" stroke="var(--ion-color-light)" strokeWidth="2.5" />
            <circle
              cx="13"
              cy="13"
              r={r}
              fill="none"
              stroke="var(--ion-color-primary)"
              strokeWidth="2.5"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 13 13)"
            />
          </svg>
          <span className="dpb-pct">
            <IonIcon icon={isPaused ? play : pause} style={{ fontSize: '13px', marginLeft: isPaused ? '2px' : '0' }} />
          </span>
        </button>
      );
    }

    case 'IMPORTING':
      return (
        <span className="dpb-btn dpb-importing" aria-label={t('download.processing', 'Processing')} title={t('download.processing', 'Processing')}>
          <IonSpinner name="crescent" />
        </span>
      );

    case 'COMPLETED':
      if (!isLocal) {
        return (
          <button className="dpb-btn dpb-available" onClick={onDownload} aria-label={t('download.download', 'Download')} title={t('download.download', 'Download')}>
            <IonIcon icon={downloadOutline} />
          </button>
        );
      }
      return (
        <button className="dpb-btn dpb-delete" onClick={onDelete} aria-label={t('download.delete', 'Delete')} title={t('download.delete', 'Delete')}>
          <IonIcon icon={trashOutline} />
        </button>
      );

    case 'FAILED':
      return (
        <button className="dpb-btn dpb-failed" onClick={onRetry} aria-label={t('download.retry', 'Retry download')} title={t('download.error', 'Failed')}>
          <IonIcon icon={alertCircleOutline} />
        </button>
      );

    case 'CANCELLED':
      return (
        <button className="dpb-btn dpb-available" onClick={onDownload} aria-label={t('download.download', 'Download')} title={t('download.download', 'Download')}>
          <IonIcon icon={downloadOutline} />
        </button>
      );

    default:
      return (
        <button className="dpb-btn dpb-available" onClick={onDownload} aria-label={t('download.download', 'Download')} title={t('download.download', 'Download')}>
          <IonIcon icon={downloadOutline} />
        </button>
      );
  }
};
