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
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTnCAccept } from '../hooks/useTnC';
import './TermsAndConditionsPage.css';

const TermsAndConditionsPage: React.FC = () => {
  const { tncData, completeTnC } = useAuth();
  const history = useHistory();

  const acceptTnC = useTnCAccept();

  const [loading, setLoading] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!tncData) {
      history.replace('/home');
    }
  }, [tncData, history]);

  const handleClose = () => {
    completeTnC();
    history.replace('/home');
  };

  const handleAccept = async () => {
    if (!tncData || acceptTnC.isPending) return;

    try {
      await acceptTnC.mutateAsync({ version: tncData.version });
      completeTnC();
      history.replace('/home');
    } catch {
      setErrorMessage('Unable to record your acceptance. Please try again later.');
      setShowError(true);
    }
  };

  const handleErrorDismiss = () => {
    setShowError(false);
    completeTnC();
    history.replace('/home');
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  if (!tncData) return null;

  return (
    <IonPage className="tnc-page">
      <IonHeader className="tnc-header ion-no-border">
        <IonToolbar className="tnc-toolbar">
          <IonTitle className="tnc-title">Terms And Conditions</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose} className="tnc-close-btn">
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

      </IonHeader>

      <IonContent fullscreen className="tnc-content">
        {loading && (
          <div className="tnc-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        <iframe
          title="Terms and Conditions"
          src={tncData.url}
          className="tnc-iframe"
          onLoad={handleIframeLoad}
        />
      </IonContent>

      <IonFooter className="tnc-footer ion-no-border">
        <div className="tnc-footer-inner">
          <label className="tnc-checkbox-row">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="tnc-checkbox"
            />
            <span className="tnc-checkbox-label">
              I understand &amp; accept the <strong>SUNBIRD</strong> Terms of Use
            </span>
          </label>

          <button
            className="tnc-accept-btn"
            disabled={!termsAgreed || acceptTnC.isPending}
            onClick={handleAccept}
          >
            {acceptTnC.isPending ? <IonSpinner name="crescent" /> : 'Continue'}
          </button>
        </div>
      </IonFooter>

      <IonAlert
        isOpen={showError}
        onDidDismiss={handleErrorDismiss}
        header="Error"
        message={errorMessage}
        buttons={['OK']}
      />
    </IonPage>
  );
};

export default TermsAndConditionsPage;
