import React, { useEffect, useRef, useCallback } from 'react';
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

  const handlePlayerEvent = useCallback((event: VideoPlayerEvent) => {
    onPlayerEvent?.(event);
  }, [onPlayerEvent]);

  const handleTelemetryEvent = useCallback((event: any) => {
    onTelemetryEvent?.(event);
  }, [onTelemetryEvent]);

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
  }, [metadata, handlePlayerEvent, handleTelemetryEvent]);

  return (
    <div
      ref={containerRef}
      className="content-player-embed"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
