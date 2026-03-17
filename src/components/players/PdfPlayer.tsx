import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { PdfPlayerService } from '../../services/players/pdf';
import type { PdfPlayerEvent, PdfPlayerContextProps, PdfPlayerMetadata } from '../../services/players/pdf';

interface PdfPlayerProps {
  metadata: PdfPlayerMetadata;
  mode?: string;
  channel?: string;
  pdata?: { id: string; ver: string; pid: string };
  did?: string;
  sid?: string;
  uid?: string;
  cdata?: any[];
  contextRollup?: { l1: string };
  objectRollup?: Record<string, any>;
  onPlayerEvent?: (event: PdfPlayerEvent) => void;
  onTelemetryEvent?: (event: any) => void;
}

export const PdfPlayer: React.FC<PdfPlayerProps> = ({
  metadata,
  mode,
  channel,
  pdata,
  did,
  sid,
  uid,
  cdata,
  contextRollup,
  objectRollup,
  onPlayerEvent,
  onTelemetryEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<PdfPlayerService>(new PdfPlayerService());

  const contextProps = useMemo<PdfPlayerContextProps | undefined>(() => {
    if (
      mode === undefined &&
      channel === undefined &&
      pdata === undefined &&
      did === undefined &&
      sid === undefined &&
      uid === undefined &&
      cdata === undefined &&
      contextRollup === undefined &&
      objectRollup === undefined
    ) {
      return undefined;
    }
    return {
      ...(mode !== undefined && { mode }),
      ...(channel !== undefined && { channel }),
      ...(pdata !== undefined && { pdata }),
      ...(did !== undefined && { did }),
      ...(sid !== undefined && { sid }),
      ...(uid !== undefined && { uid }),
      ...(cdata !== undefined && { cdata }),
      ...(contextRollup !== undefined && { contextRollup }),
      ...(objectRollup !== undefined && { objectRollup }),
    };
  }, [mode, channel, pdata, did, sid, uid, cdata, contextRollup, objectRollup]);

  const handlePlayerEvent = useCallback((event: PdfPlayerEvent) => {
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
        console.error('Failed to initialize PDF player:', error);
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
