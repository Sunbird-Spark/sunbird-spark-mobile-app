import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/react';
import { chevronBackOutline, syncOutline, downloadOutline, informationCircleOutline } from 'ionicons/icons';
import {
  settingsService,
  SYNC_DATA_OPTIONS,
  DOWNLOAD_CONTENT_OPTIONS,
  type SyncDataValue,
  type DownloadContentValue,
} from '../services/SettingsService';
import { useSystemSetting } from '../hooks/useSystemSetting';
import './SettingsPage.css';
import useImpression from '../hooks/useImpression';

const SettingsPage: React.FC = () => {
  useImpression({ pageid: 'SettingsPage', env: 'settings' });
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
  };

  return (
    <IonPage className="settings-page">
      <IonHeader className="settings-header ion-no-border">
        <IonToolbar className="settings-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/profile" icon={chevronBackOutline} text="" aria-label="Back" className="settings-back-btn" />
          </IonButtons>
          <IonTitle className="settings-title">Settings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="settings-content">
        <div className="settings-section">
          <h3 className="profile-settings-heading">Preferences</h3>
          <p className="profile-settings-subheading">Manage your data consumption and app behavior.</p>

          {/* Sync Data Card */}
          <div className="profile-settings-card">
            <div className="profile-settings-icon-badge profile-settings-icon-sync">
              <IonIcon icon={syncOutline} />
            </div>
            <div className="profile-settings-card-content">
              <div>
                <h4 className="profile-settings-card-title">Sync Usage Data</h4>
                <p className="profile-settings-card-desc">Keep your progress updated across all devices</p>
              </div>
              <div className="profile-settings-options">
                {SYNC_DATA_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`profile-settings-option-btn${syncData === option.value ? ' active-sync' : ''}`}
                    aria-pressed={syncData === option.value}
                    onClick={() => handleSyncDataChange(option.value as SyncDataValue)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Download Contents Card */}
          <div className="profile-settings-card">
            <div className="profile-settings-icon-badge profile-settings-icon-download">
              <IonIcon icon={downloadOutline} />
            </div>
            <div className="profile-settings-card-content">
              <div>
                <h4 className="profile-settings-card-title">Download contents</h4>
                <p className="profile-settings-card-desc">Offline access for your learning material</p>
              </div>
              <div className="profile-settings-options">
                {DOWNLOAD_CONTENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`profile-settings-option-btn${downloadContents === option.value ? ' active-download' : ''}`}
                    aria-pressed={downloadContents === option.value}
                    onClick={() => handleDownloadContentChange(option.value as DownloadContentValue)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* App Version Card */}
          <div className="profile-settings-card profile-settings-version-card">
            <div className="profile-settings-icon-badge profile-settings-icon-system">
              <IonIcon icon={informationCircleOutline} />
            </div>
            <div className="profile-settings-card-content">
              <div>
                <span className="profile-settings-version-label">System</span>
                <h4 className="profile-settings-version-name">{appName || 'Sunbird'}</h4>
              </div>
              <div className="profile-settings-version-row">
                <span className="profile-settings-version-desc">Build version</span>
                {appVersion && (
                  <span className="profile-settings-version-badge">
                    v{appVersion}{appBuild ? ` (${appBuild})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
