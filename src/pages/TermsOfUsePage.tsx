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
import useImpression from '../hooks/useImpression';
import './TermsAndConditionsPage.css';

/**
 * Terms of Use page - displays TnC HTML for both logged-in and guest users.
 * 
 * Data sources (in priority order):
 * 1. User profile (tncLatestVersionUrl) from AuthContext - for logged-in users
 *    AuthContext already fetches user profile via useUser(userId) with React Query caching
 * 2. System setting 'tncConfig' - for guest users or fallback
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
      // Priority 1: User profile URL from AuthContext (for logged-in users)
      // AuthContext already fetches user profile via useUser(userId) with React Query caching
      if (tncUrl) {
        setTermsUrl(tncUrl);
        // Keep loading true until iframe onLoad fires
        return;
      }

      // Priority 2: System setting (for guest users or fallback)
      try {
        const systemSettingService = new SystemSettingService();
        const response = await systemSettingService.read('tncConfig');
        
        // Parse the system setting structure
        let settingValue = response?.data?.response?.value ?? response?.data?.value;
        
        // If the value is a string, parse it as JSON
        if (typeof settingValue === 'string') {
          try {
            settingValue = JSON.parse(settingValue);
          } catch (parseError) {
            console.error('Failed to parse TnC setting value as JSON:', parseError);
          }
        }
        
        if (settingValue && typeof settingValue === 'object') {
          // Get the latest version key
          const latestVersion = settingValue.latestVersion;
          
          // Get the URL from the version-specific object
          let systemTncUrl = null;
          if (latestVersion && settingValue[latestVersion]) {
            systemTncUrl = settingValue[latestVersion].url;
          }
          
          if (systemTncUrl) {
            setTermsUrl(systemTncUrl);
            // Keep loading true until iframe onLoad fires
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
              className="tnc-back-btn"
              color="primary"
            />
          </IonButtons>
          <IonTitle className="tnc-title">{t('termsOfUse')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="tnc-content">
        <main id="main-content">
        {loading && <PageLoader message={t('loading')} />}
        {!loading && !termsUrl && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ion-color-medium)' }} role="status" aria-live="polite">
            <p>{t('tnc.notAvailable', 'Terms of Use not available')}</p>
          </div>
        )}
        {termsUrl && (
          <iframe
            title={t('termsOfUse')}
            src={termsUrl}
            className="tnc-iframe"
            onLoad={() => setLoading(false)}
            style={{ display: loading ? 'none' : 'block' }}
            sandbox="allow-same-origin allow-scripts allow-forms"
            referrerPolicy="no-referrer"
          />
        )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default TermsOfUsePage;
