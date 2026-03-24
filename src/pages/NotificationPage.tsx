import React, { useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  useIonRouter,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useNetwork } from '../providers/NetworkProvider';
import {
  useNotificationRead,
  useNotificationUpdate,
  useNotificationDelete,
  useNotificationGrouping,
} from '../hooks/useNotifications';
import NotificationCard from '../components/notifications/NotificationCard';
import PageLoader from '../components/common/PageLoader';
import type { NotificationFeed } from '../types/notificationTypes';
import './NotificationPage.css';

const NotificationPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useIonRouter();
  const { isOffline } = useNetwork();
  const { notifications, isLoading, error, refetch } = useNotificationRead();
  const { mutateAsync: updateNotification } = useNotificationUpdate();
  const { deleteNotification, deleteAll, filterDeleted } = useNotificationDelete();

  const filtered = filterDeleted(notifications);
  const { groupedNotifications, unreadCount: _ } = useNotificationGrouping(filtered);

  const handleRefresh = async (event: CustomEvent) => {
    await refetch();
    (event.detail as any).complete();
  };

  const handleTap = useCallback(async (notification: NotificationFeed) => {
    if (notification.status === 'unread') {
      await updateNotification({
        ids: [notification.id],
        userId: notification.userId,
      });
    }

    const actionType = notification.action?.type;
    const additionalInfo = notification.action?.additionalInfo;

    if (actionType === 'certificateUpdate') {
      router.push('/profile');
    } else {
      const url = additionalInfo?.contentURL ?? additionalInfo?.deepLink;
      if (url) router.push(url);
    }
  }, [updateNotification, router]);

  const handleDelete = useCallback(async (notification: NotificationFeed) => {
    await deleteNotification(notification);
  }, [deleteNotification]);

  const handleDeleteAll = useCallback(async () => {
    await deleteAll(filtered);
  }, [deleteAll, filtered]);

  return (
    <IonPage className="notification-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="notification-page__header">
          <div className="notification-page__header-inner">
            <button className="notification-page__back-btn" onClick={() => router.goBack()}>
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
                <path d="M10 2L2 10L10 18" stroke="var(--ion-color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="notification-page__title">{t('notifications')}</h1>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isOffline ? (
          <div className="notification-offline">
            <p className="notification-offline__message">{t('offlineNotifications')}</p>
          </div>
        ) : isLoading ? (
          <PageLoader message={t('loading')} />
        ) : error ? (
          <PageLoader error={error.message} onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <div className="notification-empty">
            <h3 className="notification-empty__title">{t('noNotifications')}</h3>
            <p className="notification-empty__desc">{t('noNotificationsDesc')}</p>
          </div>
        ) : (
          <div className="notification-page__content">
            {groupedNotifications.map((group, groupIndex) => (
              <div key={group.group} className="notification-section">
                <div className="notification-section__header">
                  <span className="notification-section__label">{t(group.group.toLowerCase())}</span>
                  {groupIndex === 0 && filtered.length > 0 && (
                    <button
                      className="notification-section__delete-all"
                      onClick={handleDeleteAll}
                    >
                      {t('deleteAll')}
                    </button>
                  )}
                </div>
                {group.items.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onDelete={handleDelete}
                    onTap={handleTap}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default NotificationPage;
