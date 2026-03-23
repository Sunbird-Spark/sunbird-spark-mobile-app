import React, { useEffect, useRef } from 'react';
import { VideoPlayerService } from '../../services/players/video';
import type { VideoPlayerEvent, VideoPlayerContextProps, VideoPlayerMetadata } from '../../services/players/video';

interface VideoPlayerProps {
  metadata: VideoPlayerMetadata;
  mode?: string;
  cdata?: any[];
  contextRollup?: { l1: string };
  objectRollup?: Record<string, any>;
  onPlayerEvent?: (event: VideoPlayerEvent) => void;
  onTelemetryEvent?: (event: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  metadata,
  mode,
  cdata,
  contextRollup,
  objectRollup,
  onPlayerEvent,
  onTelemetryEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<VideoPlayerService>(new VideoPlayerService());

  // Store callbacks in refs so the player init useEffect doesn't re-run
  // when callback identities change (e.g. after content state updates).
  const onPlayerEventRef = useRef(onPlayerEvent);
  useEffect(() => { onPlayerEventRef.current = onPlayerEvent; }, [onPlayerEvent]);
  const onTelemetryEventRef = useRef(onTelemetryEvent);
  useEffect(() => { onTelemetryEventRef.current = onTelemetryEvent; }, [onTelemetryEvent]);

  useEffect(() => {
    if (!containerRef.current) return;

    const service = serviceRef.current;
    let playerElement: HTMLElement | null = null;
    let cancelled = false;

    const contextProps: VideoPlayerContextProps = {
      ...(mode !== undefined && { mode }),
      ...(cdata !== undefined && { cdata }),
      ...(contextRollup !== undefined && { contextRollup }),
      ...(objectRollup !== undefined && { objectRollup }),
    };

    const handlePlayerEvent = (event: VideoPlayerEvent) => {
      onPlayerEventRef.current?.(event);
    };

    const handleTelemetryEvent = (event: any) => {
      onTelemetryEventRef.current?.(event);
    };

    const initPlayer = async () => {
      try {
        const config = await service.createConfig(metadata, contextProps);
        if (cancelled) return;

        playerElement = await service.createElement(config);
        if (cancelled) return;
        service.attachEventListeners(playerElement, handlePlayerEvent, handleTelemetryEvent);

        if (containerRef.current) {
          containerRef.current.appendChild(playerElement);
        }
      } catch (error) {
        console.error('Failed to initialize video player:', error);
      }
    };

    initPlayer();

    return () => {
      cancelled = true;
      if (playerElement) {
        service.removeEventListeners(playerElement);
        playerElement.remove();
      }
    };
  }, [metadata.identifier]);

  return (
    <div
      ref={containerRef}
      className="content-player-embed"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
