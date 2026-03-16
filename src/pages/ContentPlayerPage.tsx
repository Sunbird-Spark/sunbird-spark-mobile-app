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
import { useParams } from 'react-router-dom';
import { ContentPlayer } from '../components/players/ContentPlayer';
import { useContentRead } from '../hooks/useContent';
import './ContentPlayerPage.css';

const ContentPlayerPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const { data, isLoading, error } = useContentRead(contentId);

  const content = data?.data?.result?.content;
  const mimeType = content?.mimeType;

  const handlePlayerEvent = (event: any) => {
    console.log('[ContentPlayerPage] Player event:', event);
  };

  const handleTelemetryEvent = (event: any) => {
    console.log('[ContentPlayerPage] Telemetry event:', event);
  };

  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>Content Player</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

  if (error || !content || !mimeType) {
    return (
      <IonPage>
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
            <p>{error ? `Failed to load content: ${error.message}` : 'No content data available. Please select content to play.'}</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>{content.name || 'Content Player'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="content-player-page" scrollY={false}>
        <div className="content-player-container">
          <ContentPlayer
            mimeType={mimeType}
            metadata={content}
            onPlayerEvent={handlePlayerEvent}
            onTelemetryEvent={handleTelemetryEvent}
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContentPlayerPage;
