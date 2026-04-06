import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonSpinner,
  IonAlert,
  IonFooter,
  IonButtons,
  IonButton,
  useIonRouter,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTnCAccept } from '../hooks/useTnC';
import { useTelemetry } from '../hooks/useTelemetry';
import PageLoader from '../components/common/PageLoader';
import './TermsAndConditionsPage.css';
import useImpression from '../hooks/useImpression';

const TermsAndConditionsPage: React.FC = () => {
  useImpression({ pageid: 'TermsAndConditionsPage', env: 'user' });
  const telemetry = useTelemetry();
  const { tncData, completeTnC, userId } = useAuth();
  const { t } = useTranslation();
  const router = useIonRouter();

  useEffect(() => {
    document.title = `${t('pageTitle.termsAndConditions')}`;
  }, [t]);

  const acceptTnC = useTnCAccept();

  const [loading, setLoading] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!tncData) {
      router.push('/home', 'root', 'replace');
    }
  }, [tncData]);

  const handleClose = () => {
    completeTnC();
    router.push('/home', 'root', 'replace');
  };

  const handleAccept = async () => {
    if (!tncData || acceptTnC.isPending) return;

    try {
      await acceptTnC.mutateAsync({ version: tncData.version });
      void telemetry.audit({
        edata: { props: ['tncAccepted'], state: 'Accepted' },
        object: { id: userId || '', type: 'User', ver: '1' },
      });
      completeTnC();
      router.push('/home', 'root', 'replace');
    } catch {
      setErrorMessage(t('tnc.acceptFailed'));
      setShowError(true);
    }
  };

  const handleErrorDismiss = () => {
    setShowError(false);
    completeTnC();
    router.push('/home', 'root', 'replace');
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  if (!tncData) return null;

  return (
    <IonPage className="tnc-page">
      <IonHeader className="tnc-header ion-no-border">
        <IonToolbar className="tnc-toolbar">
          <IonTitle className="tnc-title">{t('tnc.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose} className="tnc-close-btn" aria-label={t('close')}>
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="tnc-content">
        <main id="main-content">
        {loading && (
          <PageLoader message={t('loading')} />
        )}

        <iframe
          title={t('tnc.title')}
          src={tncData.url}
          className={`tnc-iframe ${loading ? 'tnc-iframe--hidden' : ''}`}
          onLoad={handleIframeLoad}
        />
        </main>
      </IonContent>

      {!loading && (
        <IonFooter className="tnc-footer ion-no-border">
          <div className="tnc-footer-inner">
            <label className="tnc-checkbox-row" id="tnc-agree-label">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="tnc-checkbox"
              />
              <span className="tnc-checkbox-label">
                {t('tnc.iAgree')}
              </span>
            </label>

            <button
              className="tnc-accept-btn"
              disabled={!termsAgreed || acceptTnC.isPending}
              onClick={handleAccept}
              aria-describedby="tnc-agree-label"
            >
              {acceptTnC.isPending ? <IonSpinner name="crescent" /> : t('tnc.continue')}
            </button>
          </div>
        </IonFooter>
      )}

      <IonAlert
        isOpen={showError}
        onDidDismiss={handleErrorDismiss}
        header={t('tnc.error')}
        message={errorMessage}
        buttons={['OK']}
      />
    </IonPage>
  );
};

export default TermsAndConditionsPage;
