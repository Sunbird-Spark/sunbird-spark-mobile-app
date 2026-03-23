import React, { useState, useCallback } from 'react';
import { EpubPlayer } from './EpubPlayer';
import { VideoPlayer } from './VideoPlayer';
import { PdfPlayer } from './PdfPlayer';
import { EcmlPlayer } from './EcmlPlayer';
import QumlPlayer from './QumlPlayer';
import RatingDialog from '../common/RatingDialog';
import { useRatingTimer } from '../../hooks/useRatingTimer';

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

interface ContentPlayerProps {
  mimeType: string;
  metadata: any;
  mode?: string;
  cdata?: any[];
  contextRollup?: { l1: string };
  objectRollup?: Record<string, any>;
  onPlayerEvent?: (event: any) => void;
  onTelemetryEvent?: (event: any) => void;
}

export const ContentPlayer: React.FC<ContentPlayerProps> = ({
  mimeType,
  metadata,
  mode,
  cdata,
  contextRollup,
  objectRollup,
  onPlayerEvent,
  onTelemetryEvent,
}) => {
  const [ratingOpen, setRatingOpen] = useState(false);
  const openRating = useCallback(() => setRatingOpen(true), []);
  const { onContentEnd, onContentStart } = useRatingTimer(openRating);

  // Extract eid from either a telemetry event or a player event
  const extractEid = (event: any): string =>
    ((event?.eid ?? event?.data?.eid ?? event?.type) ?? '').toUpperCase();

  const handleRatingTrigger = useCallback((eid: string) => {
    if (eid === 'END') {
      console.log('[ContentPlayer] END detected — scheduling rating popup');
      onContentEnd();
    }
    if (eid === 'START') {
      console.log('[ContentPlayer] START detected — cancelling rating timer');
      onContentStart();
    }
  }, [onContentEnd, onContentStart]);

  const handleTelemetry = useCallback((event: any) => {
    const eid = extractEid(event);
    handleRatingTrigger(eid);
    onTelemetryEvent?.(event);
  }, [handleRatingTrigger, onTelemetryEvent]);

  const PlayerComponent = MIME_TYPE_PLAYERS[mimeType as SupportedMimeType] || EcmlPlayer;

  return (
    <div className="content-player-wrapper">
      <PlayerComponent
        metadata={metadata}
        mode={mode}
        cdata={cdata}
        contextRollup={contextRollup}
        objectRollup={objectRollup}
        onPlayerEvent={onPlayerEvent}
        onTelemetryEvent={handleTelemetry}
      />
      <RatingDialog
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
      />
    </div>
  );
};

export { MIME_TYPE_PLAYERS };
export type { SupportedMimeType };