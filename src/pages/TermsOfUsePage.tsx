import React, { useState, useEffect } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import PageLoader from '../components/common/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { SystemSettingService } from '../services/SystemSettingService';
import { userService } from '../services/UserService';
import useImpression from '../hooks/useImpression';
import './TermsAndConditionsPage.css';

/**
 * Terms of Use page - displays TnC HTML for both logged-in and guest users.
 * 
 * Data sources (in priority order):
 * 1. User profile (tncLatestVersionUrl) - for logged-in users
 * 2. System setting 'tncConfig' - for guest users
 * 3. Direct profile fetch - if context data is stale
 * 
 * System setting format:
 * {
 *   "latestVersion": "3.5.0",
 *   "3.5.0": {
 *     "url": "https://..."
 *   }
 * }
 */
const TermsOfUsePage: React.FC = () => {
  useImpression({ pageid: 'TermsOfUsePage', env: 'user' });
  const { t } = useTranslation();
  const { tncUrl, userId, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [termsUrl, setTermsUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadTermsUrl = async () => {
      // Priority 1: User profile URL (for logged-in users)
      if (tncUrl) {
        setTermsUrl(tncUrl);
        setLoading(false);
        return;
      }

      // Priority 2: Fetch from user profile if authenticated
      if (userId && isAuthenticated) {
        try {
          const response = await userService.userRead(userId);
          const profile = (response.data as any)?.response;
          if (profile?.tncLatestVersionUrl) {
            setTermsUrl(profile.tncLatestVersionUrl);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Failed to fetch user profile for TnC URL:', error);
        }
      }

      // Priority 3: System setting (for guest users or fallback)
      try {
        const systemSettingService = new SystemSettingService();
        const response = await systemSettingService.read('tncConfig');
        
        console.log('TnC System Setting Full Response:', response);
        
        // Parse the system setting structure
        let settingValue = response?.data?.response?.value ?? response?.data?.value;
        
        console.log('TnC Setting Value (raw):', settingValue, 'Type:', typeof settingValue);
        
        // If the value is a string, parse it as JSON
        if (typeof settingValue === 'string') {
          try {
            settingValue = JSON.parse(settingValue);
            console.log('TnC Setting Value (parsed):', settingValue);
          } catch (parseError) {
            console.error('Failed to parse TnC setting value as JSON:', parseError);
          }
        }
        
        if (settingValue && typeof settingValue === 'object') {
          // Get the latest version key
          const latestVersion = settingValue.latestVersion;
          
          console.log('Latest Version:', latestVersion);
          
          // Get the URL from the version-specific object
          let systemTncUrl = null;
          if (latestVersion && settingValue[latestVersion]) {
            systemTncUrl = settingValue[latestVersion].url;
            console.log('Found TnC URL from version key:', systemTncUrl);
          }
          
          if (systemTncUrl) {
            setTermsUrl(systemTncUrl);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch TnC from system settings:', error);
      }

      // No URL found
      console.warn('No TnC URL found from any source');
      setLoading(false);
    };

    loadTermsUrl();
  }, [tncUrl, userId, isAuthenticated]);

  return (
    <IonPage className="tnc-page">
      <IonHeader className="tnc-header ion-no-border">
        <IonToolbar className="tnc-toolbar">
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/profile/settings"
              icon={chevronBackOutline}
              text=""
              className="settings-back-btn"
              color="primary"
            />
          </IonButtons>
          <IonTitle className="tnc-title">{t('termsOfUse')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="tnc-content">
        {loading && <PageLoader message={t('loading')} />}
        {!loading && !termsUrl && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ion-color-medium)' }}>
            <p>{t('tnc.notAvailable') || 'Terms of Use not available'}</p>
          </div>
        )}
        {termsUrl && (
          <iframe
            title={t('termsOfUse')}
            src={termsUrl}
            className="tnc-iframe"
            onLoad={() => setLoading(false)}
            style={{ display: loading ? 'none' : 'block' }}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

export default TermsOfUsePage;
