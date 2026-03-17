import { useCallback, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ContentPlayer } from '../components/players/ContentPlayer';
import { useContentRead } from '../hooks/useContent';
import { useQumlContent } from '../hooks/useQumlContent';
import './ContentPlayerPage.css';

const QUML_MIME_TYPES = [
  'application/vnd.sunbird.questionset',
  'application/vnd.sunbird.question',
];

const ContentPlayerPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const history = useHistory();

  // First fetch content metadata to determine mimeType
  const { data, isLoading, error } = useContentRead(contentId);
  const contentData = data?.data?.content;
  const isQumlContent = QUML_MIME_TYPES.includes(contentData?.mimeType);

  // For QuML content, fetch hierarchy + questions via dedicated hook
  const {
    data: qumlData,
    isLoading: isQumlLoading,
    error: qumlError,
  } = useQumlContent(contentId, { enabled: isQumlContent });

  // Use QuML data when applicable, otherwise standard content data
  const playerMetadata = isQumlContent ? qumlData : contentData;
  const playerIsLoading = isLoading || (isQumlContent && isQumlLoading);
  const playerError = error || (isQumlContent ? qumlError : null);
  const mimeType = playerMetadata?.mimeType;

  // Lock to landscape on mount, unlock on unmount
  useEffect(() => {
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => {
      ScreenOrientation.unlock().catch(() => {});
    };
  }, []);

  const handleBack = useCallback(() => {
    ScreenOrientation.unlock().catch(() => {});
    history.goBack();
  }, [history]);

  const handlePlayerEvent = (event: any) => {
    console.log('[ContentPlayerPage] Player event:', event);
  };

  const handleTelemetryEvent = (event: any) => {
    console.log('[ContentPlayerPage] Telemetry event:', event);
  };

  if (playerIsLoading) {
    return (
      <IonPage className="content-player-fullscreen">
        <IonContent className="ion-padding ion-text-center">
          <div className="content-player-loading">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (playerError || !playerMetadata || !mimeType) {
    return (
      <IonPage className="content-player-fullscreen">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>Content Player</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="content-player-error">
            <p>{playerError ? `Failed to load content: ${playerError.message}` : 'No content data available. Please select content to play.'}</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="content-player-fullscreen">
      <IonContent scrollY={false}>
        <button className="content-player-close-btn" onClick={handleBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 1L1 13M1 1L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="content-player-container">
          <ContentPlayer
            mimeType={mimeType}
            metadata={playerMetadata}
            onPlayerEvent={handlePlayerEvent}
            onTelemetryEvent={handleTelemetryEvent}
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContentPlayerPage;
