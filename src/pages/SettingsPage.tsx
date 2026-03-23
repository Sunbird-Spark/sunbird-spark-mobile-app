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
import { chevronBackOutline, syncOutline, downloadOutline } from 'ionicons/icons';
import {
  settingsService,
  SYNC_DATA_OPTIONS,
  DOWNLOAD_CONTENT_OPTIONS,
} from '../services/SettingsService';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const [syncData, setSyncDataState] = useState<string>('wifi');
  const [downloadContents, setDownloadContentsState] = useState<string>('always');
  const [appVersion, setAppVersion] = useState<string>('');
  const [appBuild, setAppBuild] = useState<string>('');

  // Load persisted values from DB and app version on mount
  useEffect(() => {
    settingsService.getSyncData().then(setSyncDataState);
    settingsService.getDownloadContent().then(setDownloadContentsState);
    settingsService.getAppVersion().then(({ version, build }) => {
      setAppVersion(version);
      setAppBuild(build);
    });
  }, []);

  const handleSyncDataChange = async (value: string) => {
    await settingsService.setSyncData(value);
    setSyncDataState(value);
  };

  const handleDownloadContentChange = async (value: string) => {
    await settingsService.setDownloadContent(value);
    setDownloadContentsState(value);
  };

  return (
    <IonPage className="settings-page">
      <IonHeader className="settings-header ion-no-border">
        <IonToolbar className="settings-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/profile" icon={chevronBackOutline} text="" className="settings-back-btn" />
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
                    className={`profile-settings-option-btn${syncData === option.value ? ' active-sync' : ''}`}
                    onClick={() => handleSyncDataChange(option.value)}
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
                    className={`profile-settings-option-btn${downloadContents === option.value ? ' active-download' : ''}`}
                    onClick={() => handleDownloadContentChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* App Version Card */}
          <div className="profile-settings-version-card">
            <span className="profile-settings-version-label">System</span>
            <h4 className="profile-settings-version-name">Sunbird</h4>
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
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
