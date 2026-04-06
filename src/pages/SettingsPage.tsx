import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonHeader,
  useIonRouter,
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, documentTextOutline, syncOutline, downloadOutline, informationCircleOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/common/LanguageSelector';
import {
  settingsService,
  SYNC_DATA_OPTIONS,
  DOWNLOAD_CONTENT_OPTIONS,
  type SyncDataValue,
  type DownloadContentValue,
} from '../services/SettingsService';
import { downloadManager } from '../services/download_manager';
import { useSystemSetting } from '../hooks/useSystemSetting';
import './SettingsPage.css';
import useImpression from '../hooks/useImpression';

const SettingsPage: React.FC = () => {
  useImpression({ pageid: 'SettingsPage', env: 'settings' });
  const { t } = useTranslation();
  const router = useIonRouter();

  useEffect(() => {
    document.title = `${t('pageTitle.settings')} — Sunbird Spark`;
  }, [t]);

  const [syncData, setSyncDataState] = useState<SyncDataValue>('wifi');
  const [downloadContents, setDownloadContentsState] = useState<DownloadContentValue>('always');
  const [appVersion, setAppVersion] = useState<string>('');
  const [appBuild, setAppBuild] = useState<string>('');

  const appNameQuery = useSystemSetting('sunbird');
  const appName: string | undefined =
    appNameQuery.data?.data?.response?.value ?? appNameQuery.data?.data?.value;

  // Load persisted values from DB and app version on mount
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      const [syncDataValue, downloadContentValue, appInfo] = await Promise.all([
        settingsService.getSyncData(),
        settingsService.getDownloadContent(),
        settingsService.getAppVersion(),
      ]);
      if (!isMounted) return;
      setSyncDataState(syncDataValue);
      setDownloadContentsState(downloadContentValue);
      setAppVersion(appInfo.version);
      setAppBuild(appInfo.build);
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const handleSyncDataChange = async (value: SyncDataValue) => {
    await settingsService.setSyncData(value);
    setSyncDataState(value);
  };

  const handleDownloadContentChange = async (value: DownloadContentValue) => {
    await settingsService.setDownloadContent(value);
    setDownloadContentsState(value);
    downloadManager.setWifiOnly(value === 'wifi');
  };

  return (
    <IonPage className="settings-page">
      <IonHeader className="ion-no-border">
        <div className="page-header">
          <div className="page-header__start">
            <button className="page-header__back-btn" onClick={() => router.goBack()} aria-label={t('back')}>
              <IonIcon icon={chevronBackOutline} aria-hidden="true" />
            </button>
            <span className="page-header__title">{t('settings')}</span>
          </div>
          <div className="page-header__actions">
            <LanguageSelector />
          </div>
        </div>
      </IonHeader>

      <IonContent className="settings-content">
        <main id="main-content">
        <div className="settings-section">
          <h3 className="profile-settings-heading">{t('settingsPage.preferences')}</h3>
          <p className="profile-settings-subheading">{t('settingsPage.preferencesDesc')}</p>

          {/* Sync Data Card */}
          <div className="profile-settings-card">
            <div className="profile-settings-icon-badge profile-settings-icon-sync" aria-hidden="true">
              <IonIcon icon={syncOutline} />
            </div>
            <div className="profile-settings-card-content">
              <div>
                <h4 className="profile-settings-card-title" id="settings-sync-label">{t('settingsPage.syncUsageData')}</h4>
                <p className="profile-settings-card-desc">{t('settingsPage.syncDesc')}</p>
              </div>
              <div className="profile-settings-options" role="group" aria-labelledby="settings-sync-label">
                {SYNC_DATA_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`profile-settings-option-btn${syncData === option.value ? ' active-sync' : ''}`}
                    aria-pressed={syncData === option.value}
                    onClick={() => handleSyncDataChange(option.value as SyncDataValue)}
                  >
                    {t(`settingsPage.${option.value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Download Contents Card */}
          <div className="profile-settings-card">
            <div className="profile-settings-icon-badge profile-settings-icon-download" aria-hidden="true">
              <IonIcon icon={downloadOutline} />
            </div>
            <div className="profile-settings-card-content">
              <div>
                <h4 className="profile-settings-card-title" id="settings-download-label">{t('settingsPage.downloadContents')}</h4>
                <p className="profile-settings-card-desc">{t('settingsPage.downloadDesc')}</p>
              </div>
              <div className="profile-settings-options" role="group" aria-labelledby="settings-download-label">
                {DOWNLOAD_CONTENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`profile-settings-option-btn${downloadContents === option.value ? ' active-download' : ''}`}
                    aria-pressed={downloadContents === option.value}
                    onClick={() => handleDownloadContentChange(option.value as DownloadContentValue)}
                  >
                    {t(`settingsPage.${option.value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* App Version Card */}
          <div className="profile-settings-card profile-settings-version-card">
            <div className="profile-settings-icon-badge profile-settings-icon-system" aria-hidden="true">
              <IonIcon icon={informationCircleOutline} />
            </div>
            <div className="profile-settings-card-content">
              <div>
                <span className="profile-settings-version-label">{t('settingsPage.system')}</span>
                <h4 className="profile-settings-version-name">{appName || 'Sunbird'}</h4>
              </div>
              <div className="profile-settings-version-row">
                <span className="profile-settings-version-desc">{t('settingsPage.buildVersion')}</span>
                {appVersion && (
                  <span className="profile-settings-version-badge">
                    v{appVersion}{appBuild ? ` (${appBuild})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Terms of Use */}
          <button
            type="button"
            className="profile-settings-card profile-settings-tou-card"
            onClick={() => router.push('/terms-of-use', 'forward', 'push')}
          >
            <div className="profile-settings-tou-icon">
              <IonIcon icon={documentTextOutline} />
            </div>
            <span className="profile-settings-card-title profile-settings-tou-title">{t('termsOfUse')}</span>
            <IonIcon icon={chevronForwardOutline} className="profile-settings-tou-chevron" aria-hidden="true" />
          </button>
        </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
