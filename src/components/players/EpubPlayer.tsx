import React, { useEffect, useRef } from 'react';
import { EpubPlayerService } from '../../services/players/epub';
import type { EpubPlayerEvent, EpubPlayerContextProps, EpubPlayerMetadata } from '../../services/players/epub';

interface EpubPlayerProps {
  metadata: EpubPlayerMetadata;
  mode?: string;
  cdata?: any[];
  contextRollup?: { l1: string };
  objectRollup?: Record<string, any>;
  onPlayerEvent?: (event: EpubPlayerEvent) => void;
  onTelemetryEvent?: (event: any) => void;
}

export const EpubPlayer: React.FC<EpubPlayerProps> = ({
  metadata,
  mode,
  cdata,
  contextRollup,
  objectRollup,
  onPlayerEvent,
  onTelemetryEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<EpubPlayerService>(new EpubPlayerService());

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

    const contextProps: EpubPlayerContextProps = {
      ...(mode !== undefined && { mode }),
      ...(cdata !== undefined && { cdata }),
      ...(contextRollup !== undefined && { contextRollup }),
      ...(objectRollup !== undefined && { objectRollup }),
    };

    const handlePlayerEvent = (event: EpubPlayerEvent) => {
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
        console.error('Failed to initialize EPUB player:', error);
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
  }, [metadata.identifier, metadata.isAvailableLocally]);

  return (
    <div
      ref={containerRef}
      className="content-player-embed"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
