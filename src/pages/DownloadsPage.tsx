import React, { useMemo } from 'react';
import {
  IonContent,
  IonPage,
  IonProgressBar,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import {
  pauseCircleOutline,
  playCircleOutline,
  closeCircleOutline,
  refreshOutline,
  alertCircleOutline,
  timeOutline,
  cloudDownloadOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { useDownloadQueue } from '../hooks/useDownloadQueue';
import { useStorageInfo } from '../hooks/useStorageInfo';
import { downloadManager, DownloadState } from '../services/download_manager';
import type { DownloadQueueEntry } from '../services/download_manager/types';
import './DownloadsPage.css';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function parseName(entry: DownloadQueueEntry): string {
  if (entry.content_meta) {
    try {
      const meta = JSON.parse(entry.content_meta);
      if (meta.name) return meta.name;
    } catch {
      // ignore
    }
  }
  return entry.identifier;
}

const ACTIVE_STATES = new Set<string>([
  DownloadState.DOWNLOADING,
  DownloadState.PAUSED,
  DownloadState.IMPORTING,
  DownloadState.DOWNLOADED,
]);
const QUEUED_STATES = new Set<string>([DownloadState.QUEUED, DownloadState.RETRY_WAIT]);

const DownloadsPage: React.FC = () => {
  const { t } = useTranslation();
  const allEntries = useDownloadQueue();
  const storage = useStorageInfo();

  const { active, queued, failed } = useMemo(() => {
    const a: DownloadQueueEntry[] = [];
    const q: DownloadQueueEntry[] = [];
    const f: DownloadQueueEntry[] = [];
    for (const entry of allEntries) {
      if (ACTIVE_STATES.has(entry.state)) a.push(entry);
      else if (QUEUED_STATES.has(entry.state)) q.push(entry);
      else if (entry.state === DownloadState.FAILED) f.push(entry);
    }
    return { active: a, queued: q, failed: f };
  }, [allEntries]);

  const hasAny = active.length + queued.length + failed.length > 0;

  return (
    <IonPage>
      <AppHeader title={t('downloads')} />
      <IonContent fullscreen>
        {!hasAny ? (
          <div className="dl-empty">
            <IonIcon icon={cloudDownloadOutline} className="dl-empty-icon" />
            <h2>{t('download.noActiveDownloads')}</h2>
            <p>{t('download.noActiveDownloadsDesc')}</p>
          </div>
        ) : (
          <div className="dl-container">
            {/* Cancel All */}
            {(active.length + queued.length > 0) && (
              <div className="dl-actions-bar">
                <button className="dl-cancel-all" onClick={() => downloadManager.cancelAll()}>
                  {t('download.cancelAll')}
                </button>
              </div>
            )}

            {/* Active Downloads */}
            {active.length > 0 && (
              <section className="dl-section">
                <h3 className="dl-section-title">
                  {t('download.downloading')} ({active.length})
                </h3>
                {active.map((entry) => (
                  <div key={entry.identifier} className="dl-item">
                    <div className="dl-item-info">
                      <span className="dl-item-name">{parseName(entry)}</span>
                      <span className="dl-item-size">
                        {formatBytes(entry.bytes_downloaded)} / {formatBytes(entry.total_bytes)}
                      </span>
                      {entry.state === DownloadState.IMPORTING ? (
                        <div className="dl-item-status">
                          <IonSpinner name="crescent" />
                          <span>{t('download.processing')}</span>
                        </div>
                      ) : (
                        <IonProgressBar
                          value={entry.progress / 100}
                          className="dl-progress"
                        />
                      )}
                    </div>
                    <div className="dl-item-actions">
                      {entry.state === DownloadState.DOWNLOADING && (
                        <button
                          className="dl-icon-btn"
                          onClick={() => downloadManager.pause(entry.identifier)}
                          aria-label={t('pause', 'Pause')}
                        >
                          <IonIcon icon={pauseCircleOutline} />
                        </button>
                      )}
                      {entry.state === DownloadState.PAUSED && (
                        <button
                          className="dl-icon-btn"
                          onClick={() => downloadManager.resume(entry.identifier)}
                          aria-label={t('download.resume', 'Resume')}
                        >
                          <IonIcon icon={playCircleOutline} />
                        </button>
                      )}
                      {entry.state !== DownloadState.IMPORTING && (
                        <button
                          className="dl-icon-btn dl-icon-danger"
                          onClick={() => downloadManager.cancel(entry.identifier)}
                          aria-label={t('cancel', 'Cancel')}
                        >
                          <IonIcon icon={closeCircleOutline} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Queued */}
            {queued.length > 0 && (
              <section className="dl-section">
                <h3 className="dl-section-title">
                  {t('download.queued')} ({queued.length})
                </h3>
                {queued.map((entry) => (
                  <div key={entry.identifier} className="dl-item">
                    <div className="dl-item-info">
                      <span className="dl-item-name">{parseName(entry)}</span>
                      <span className="dl-item-status-text">
                        <IonIcon icon={timeOutline} />
                        {t('download.waiting')}
                      </span>
                    </div>
                    <div className="dl-item-actions">
                      <button
                        className="dl-icon-btn dl-icon-danger"
                        onClick={() => downloadManager.cancel(entry.identifier)}
                        aria-label={t('cancel', 'Cancel')}
                      >
                        <IonIcon icon={closeCircleOutline} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Failed */}
            {failed.length > 0 && (
              <section className="dl-section">
                <h3 className="dl-section-title dl-section-failed">
                  {t('download.failed')} ({failed.length})
                </h3>
                <button
                  className="dl-retry-all"
                  onClick={() => downloadManager.retryAllFailed()}
                >
                  {t('download.retryAll')}
                </button>
                {failed.map((entry) => (
                  <div key={entry.identifier} className="dl-item">
                    <div className="dl-item-info">
                      <span className="dl-item-name">{parseName(entry)}</span>
                      {entry.last_error && (
                        <span className="dl-item-error">
                          <IonIcon icon={alertCircleOutline} />
                          {entry.last_error}
                        </span>
                      )}
                    </div>
                    <div className="dl-item-actions">
                      <button
                        className="dl-icon-btn"
                        onClick={() => downloadManager.retry(entry.identifier)}
                        aria-label={t('retry', 'Retry')}
                      >
                        <IonIcon icon={refreshOutline} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Storage Footer */}
            <div className="dl-storage-footer">
              <span>
                {storage.itemCount} {storage.itemCount === 1 ? t('download.item') : t('download.items')} · {formatBytes(storage.totalBytes)} {t('download.used')}
              </span>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DownloadsPage;
