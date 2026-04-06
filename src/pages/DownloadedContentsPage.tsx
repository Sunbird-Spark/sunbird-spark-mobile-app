import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonAlert,
  IonImg,
  useIonRouter,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import { deleteDownloadedContent } from '../services/content/contentDeleteHelper';
import type { ContentEntry } from '../services/download_manager/types';
import { getPlaceholderImage } from '../utils/placeholderImages';
import './DownloadedContentsPage.css';
import useImpression from '../hooks/useImpression';
import { useHistory } from 'react-router';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function parseContentMeta(entry: ContentEntry): { name: string; appIcon?: string; description?: string } {
  try {
    const server = entry.server_data ? JSON.parse(entry.server_data) : null;
    const local = entry.local_data ? JSON.parse(entry.local_data) : null;

    const name = server?.name || local?.name || entry.identifier;
    const description = server?.description || local?.description;

    // Prefer locally downloaded icon for offline access.
    // appIconLocal is a filename (e.g. "appIcon.png") saved by ImportService.
    let appIcon: string | undefined;
    if (local?.appIconLocal && entry.path) {
      const basePath = entry.path.replace(/\/$/, '');
      appIcon = Capacitor.convertFileSrc(`${basePath}/${local.appIconLocal}`);
    } else {
      appIcon = server?.appIcon || server?.posterImage || local?.appIcon || local?.posterImage;
    }

    return { name, appIcon, description };
  } catch {
    return { name: entry.identifier };
  }
}

/* ── Trash icon ── */
const TrashIcon: React.FC = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1 5H19M8 10V16M12 10V16M3 5L4 19C4 20.1046 4.89543 21 6 21H14C15.1046 21 16 20.1046 16 19L17 5M7 5V2C7 1.44772 7.44772 1 8 1H12C12.5523 1 13 1.44772 13 2V5"
      stroke="var(--color-a14f34, #A14F34)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Swipeable card ── */
const SwipeableCard: React.FC<{
  entry: ContentEntry;
  onDelete: (entry: ContentEntry) => void;
  onNavigate: (entry: ContentEntry) => void;
}> = ({ entry, onDelete, onNavigate }) => {
  const { t } = useTranslation();
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipingRef = useRef(false);

  const meta = parseContentMeta(entry);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    swipingRef.current = true;
    setIsSwiping(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipingRef.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    if (diff > 0) setOffset(Math.min(diff, 70));
    else setOffset(0);
  };
  const onTouchEnd = () => {
    swipingRef.current = false;
    setIsSwiping(false);
    setOffset((prev) => (prev > 35 ? 70 : 0));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    swipingRef.current = true;
    setIsSwiping(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!swipingRef.current) return;
    const diff = startX.current - e.clientX;
    if (diff > 0) setOffset(Math.min(diff, 70));
    else setOffset(0);
  };
  const onMouseUp = () => {
    swipingRef.current = false;
    setIsSwiping(false);
    setOffset((prev) => (prev > 35 ? 70 : 0));
  };
  const onMouseLeave = () => {
    if (swipingRef.current) {
      swipingRef.current = false;
      setIsSwiping(false);
      setOffset((prev) => (prev > 35 ? 70 : 0));
    }
  };

  return (
    <div className="dc-swipe-wrapper">
      <div role="button" tabIndex={0} className="dc-delete-action" onClick={() => onDelete(entry)} onKeyDown={(e) => { if (e.key === 'Enter') onDelete(entry); if (e.key === ' ') { e.preventDefault(); onDelete(entry); } }} aria-label={t('deleteItem', { name: meta.name })}>
        <TrashIcon />
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="dc-card"
        style={{
          transform: `translateX(-${offset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s ease',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div
          role="button"
          tabIndex={0}
          className="dc-card-body"
          aria-label={t('openItem', { name: meta.name })}
          onClick={() => { if (offset === 0 && !isSwiping) onNavigate(entry); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && offset === 0 && !isSwiping) onNavigate(entry); if (e.key === ' ' && offset === 0 && !isSwiping) { e.preventDefault(); onNavigate(entry); } }}
        >
          <div className="dc-card-info">
            <span className="dc-badge dc-badge-ongoing">{entry.primary_category || entry.content_type || 'Content'}</span>
            <h3 className="dc-course-title">{meta.name}</h3>
            {entry.size_on_device > 0 && (
              <p className="dc-due-date">{formatBytes(entry.size_on_device)}</p>
            )}
          </div>
          <div className="dc-thumbnail">
            <IonImg
              src={meta.appIcon || getPlaceholderImage(entry.identifier)}
              alt={meta.name}
              className="dc-thumb-img"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main page ── */
const DownloadedContentsPage: React.FC = () => {
  useImpression({ pageid: 'DownloadedContentsPage', env: 'profile' });
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('pageTitle.downloadedContents')} — Sunbird Spark`;
  }, [t]);

  const history = useHistory();
  const [items, setItems] = useState<ContentEntry[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ContentEntry | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  const loadItems = useCallback(() => {
    contentDbService.getDownloadedContent().then(setItems);
  }, []);

  useEffect(() => {
    loadItems();
    const unsub = downloadManager.subscribe((event) => {
      if (
        event.type === 'state_change' ||
        event.type === 'all_done' ||
        event.type === 'content_deleted'
      ) {
        loadItems();
      }
    });
    return unsub;
  }, [loadItems]);

  const handleDeleteRequest = (entry: ContentEntry) => {
    setDeleteTarget(entry);
    setShowAlert(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteDownloadedContent(deleteTarget.identifier);
      loadItems();
    }
    setDeleteTarget(null);
    setShowAlert(false);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setShowAlert(false);
  };

  const deleteName = deleteTarget ? parseContentMeta(deleteTarget).name : '';

  return (
    <IonPage className="downloaded-contents-page">
      <IonHeader className="dc-header ion-no-border">
        <IonToolbar className="dc-toolbar">
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/profile"
              text=""
              icon={chevronBackOutline}
              className="dc-back-btn"
              color="primary"
            />
          </IonButtons>
          <IonTitle className="dc-title">{t('downloadedContents')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="dc-content">
        <main id="main-content">
        {items.length === 0 ? (
          <div className="dc-empty" role="status" aria-live="polite">
            <p>{t('download.noDownloadedContent')}</p>
          </div>
        ) : (
          <div className="dc-cards-container">
            {items.map((entry) => (
              <SwipeableCard
                key={entry.identifier}
                entry={entry}
                onDelete={handleDeleteRequest}
                onNavigate={(e) => {
                  const path = e.mime_type?.includes('collection')
                    ? `/collection/${e.identifier}`
                    : `/content/${e.identifier}`;
                  history.push(path, { parentRoute: '/profile/downloaded-contents' });
                }}
              />
            ))}
          </div>
        )}
        </main>
      </IonContent>

      <IonAlert
        isOpen={showAlert}
        onDidDismiss={cancelDelete}
        header={t('download.deleteTitle')}
        message={t('download.deleteMessage', { name: deleteName })}
        cssClass="dc-delete-alert"
        buttons={[
          { text: t('cancel'), role: 'cancel', handler: cancelDelete },
          { text: t('download.delete'), role: 'destructive', handler: confirmDelete },
        ]}
      />
    </IonPage>
  );
};

export default DownloadedContentsPage;
