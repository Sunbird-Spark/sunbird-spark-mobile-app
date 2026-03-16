import React, { useEffect, useRef, useMemo, useCallback } from 'react';
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

  const contextProps = useMemo<EpubPlayerContextProps | undefined>(() => {
    if (mode === undefined && cdata === undefined && contextRollup === undefined && objectRollup === undefined) {
      return undefined;
    }
    return {
      ...(mode !== undefined && { mode }),
      ...(cdata !== undefined && { cdata }),
      ...(contextRollup !== undefined && { contextRollup }),
      ...(objectRollup !== undefined && { objectRollup }),
    };
  }, [mode, cdata, contextRollup, objectRollup]);

  const handlePlayerEvent = useCallback((event: EpubPlayerEvent) => {
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
  }, [metadata, contextProps, handlePlayerEvent, handleTelemetryEvent]);

  return (
    <div
      ref={containerRef}
      className="content-player-embed"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
