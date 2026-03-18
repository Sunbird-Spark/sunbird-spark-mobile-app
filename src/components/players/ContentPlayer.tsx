import React, { useCallback, useEffect, useMemo } from 'react';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { EpubPlayer } from './EpubPlayer';
import { VideoPlayer } from './VideoPlayer';
import { PdfPlayer } from './PdfPlayer';
import { EcmlPlayer } from './EcmlPlayer';
import QumlPlayer from './QumlPlayer';
import { useContentRead } from '../../hooks/useContent';
import { useQumlContent } from '../../hooks/useQumlContent';
import './ContentPlayer.css';

// MIME type to player component mapping
const MIME_TYPE_PLAYERS = {
  'application/epub': EpubPlayer,
  'video/x-youtube': EcmlPlayer,
  'video/webm': VideoPlayer,
  'video/mp4': VideoPlayer,
  'application/pdf': PdfPlayer,
  'application/vnd.ekstep.h5p-archive': EcmlPlayer,
  'application/vnd.ekstep.ecml-archive': EcmlPlayer,
  'application/vnd.sunbird.questionset': QumlPlayer,
  'application/vnd.sunbird.question': QumlPlayer,
  'application/vnd.ekstep.html-archive': EcmlPlayer,
} as const;

type SupportedMimeType = keyof typeof MIME_TYPE_PLAYERS;

const QUML_MIME_TYPES = [
  'application/vnd.sunbird.questionset',
  'application/vnd.sunbird.question',
];

interface ContentPlayerProps {
  contentId: string;
  onClose: () => void;
}

export const ContentPlayer: React.FC<ContentPlayerProps> = ({ contentId, onClose }) => {
  const { data, isLoading } = useContentRead(contentId);
  const contentData = data?.data?.content;
  const isQumlContent = QUML_MIME_TYPES.includes(contentData?.mimeType);

  const {
    data: qumlData,
    isLoading: isQumlLoading,
  } = useQumlContent(contentId, { enabled: isQumlContent });

  const playerMetadata = isQumlContent ? qumlData : contentData;
  const mimeType = playerMetadata?.mimeType;
  const isReady = !isLoading && !(isQumlContent && isQumlLoading) && !!playerMetadata && !!mimeType;

  const PlayerComponent = useMemo(
    () => (mimeType ? (MIME_TYPE_PLAYERS[mimeType as SupportedMimeType] || EcmlPlayer) : null),
    [mimeType]
  );

  // Lock to landscape on mount, unlock on unmount
  useEffect(() => {
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => {
      ScreenOrientation.unlock().catch(() => {});
    };
  }, []);

  const handleClose = useCallback(() => {
    ScreenOrientation.unlock().catch(() => {});
    onClose();
  }, [onClose]);

  const handleTelemetry = useCallback((event: any) => {
    const eid = ((event?.eid ?? event?.data?.eid ?? event?.type) ?? '').toUpperCase();
    if (eid === 'END') {
      console.log('[ContentPlayer] Content ended');
    }
    if (eid === 'START') {
      console.log('[ContentPlayer] Content started');
    }
    // Handle EXIT interact event
    if (eid === 'INTERACT') {
      const edataId = (event?.edata?.id ?? '').toLowerCase();
      if (edataId === 'exit') {
        handleClose();
        return;
      }
    }
  }, [handleClose]);

  const handlePlayerEvent = useCallback((event: any) => {
    console.log('[ContentPlayer] Player event:', event);
  }, []);

  return (
    <IonPage className="cp-fullscreen">
      <IonContent scrollY={false}>
        <button className="cp-close-btn" onClick={handleClose} aria-label="Close player">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 1L1 13M1 1L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {!isReady ? (
          <div className="cp-fullscreen-center">
            <IonSpinner color="light" />
          </div>
        ) : (
          <div className="cp-player-fullscreen-container">
            <div className="content-player-wrapper">
              {PlayerComponent && (
                <PlayerComponent
                  metadata={playerMetadata}
                  onPlayerEvent={handlePlayerEvent}
                  onTelemetryEvent={handleTelemetry}
                />
              )}
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export { MIME_TYPE_PLAYERS };
export type { SupportedMimeType };
