import React, { useEffect, useRef } from 'react';
import { EcmlPlayerService } from '../../services/players/ecml';
import type { EcmlPlayerEvent, EcmlPlayerContextProps, EcmlPlayerMetadata } from '../../services/players/ecml';

interface EcmlPlayerProps {
  metadata: EcmlPlayerMetadata;
  mode?: string;
  cdata?: any[];
  contextRollup?: { l1: string };
  objectRollup?: Record<string, any>;
  onPlayerEvent?: (event: EcmlPlayerEvent) => void;
  onTelemetryEvent?: (event: any) => void;
}

export const EcmlPlayer: React.FC<EcmlPlayerProps> = ({
  metadata,
  mode,
  cdata,
  contextRollup,
  objectRollup,
  onPlayerEvent,
  onTelemetryEvent,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const serviceRef = useRef<EcmlPlayerService>(new EcmlPlayerService());

  const onPlayerEventRef = useRef(onPlayerEvent);
  useEffect(() => { onPlayerEventRef.current = onPlayerEvent; }, [onPlayerEvent]);
  const onTelemetryEventRef = useRef(onTelemetryEvent);
  useEffect(() => { onTelemetryEventRef.current = onTelemetryEvent; }, [onTelemetryEvent]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const service = serviceRef.current;
    let cancelled = false;

    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from our player iframe at the same origin
      if (event.source !== iframe.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      if (!event.data) return;

      const rawData = typeof event.data === 'string'
        ? (() => { try { return JSON.parse(event.data); } catch { return null; } })()
        : event.data;
      if (!rawData) return;

      // Intelligent un-nesting: some renderer versions/dispatchers wrap events in 'target', 'detail' or 'eventData'
      const eventData = (rawData.eid || rawData.event)
        ? rawData
        : (rawData.target || rawData.detail || rawData.eventData || rawData);

      const eid = eventData.eid || eventData.event;
      if (!eid) return;

      const playerEvent: EcmlPlayerEvent = {
        type: eid,
        data: eventData,
        playerId: metadata.identifier,
        timestamp: Date.now(),
      };

      onPlayerEventRef.current?.(playerEvent);
      onTelemetryEventRef.current?.(eventData);
    };

    const telemetryCustomEventHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail;
      if (!eventData) return;

      const telemetryData = eventData.telemetryData ?? eventData;

      const playerEvent: EcmlPlayerEvent = {
        type: telemetryData.eid || telemetryData.event || 'unknown',
        data: telemetryData,
        playerId: metadata.identifier,
        timestamp: Date.now(),
      };

      onPlayerEventRef.current?.(playerEvent);

      if (telemetryData.eid) {
        onTelemetryEventRef.current?.(telemetryData);
      }
    };

    iframe.addEventListener('renderer:telemetry:event', telemetryCustomEventHandler);

    const contextProps: EcmlPlayerContextProps = {
      ...(mode !== undefined && { mode }),
      ...(cdata !== undefined && { cdata }),
      ...(contextRollup !== undefined && { contextRollup }),
      ...(objectRollup !== undefined && { objectRollup }),
    };

    const initPlayer = async () => {
      try {
        const config = await service.createConfig(metadata, contextProps);
        if (cancelled) return;

        const playerUrl = service.buildPlayerUrl();
        iframe.src = playerUrl;

        iframe.onload = () => {
          if (cancelled) return;
          // Send config to the iframe via postMessage.
          // The custom preview.html listens for this and calls initializePreview.
          // This avoids cross-origin contentWindow access issues in Capacitor.
          iframe.contentWindow?.postMessage(
            { __ecmlPlayerConfig: true, config },
            window.location.origin
          );
        };

        window.addEventListener('message', messageHandler);
      } catch (error) {
        console.error('Failed to initialize ECML player:', error);
      }
    };

    initPlayer();

    return () => {
      cancelled = true;
      window.removeEventListener('message', messageHandler);
      iframe.removeEventListener('renderer:telemetry:event', telemetryCustomEventHandler);
      if (iframe) {
        iframe.onload = null;
      }
    };
  }, [metadata.identifier, metadata.isAvailableLocally]);

  return (
    <iframe
      ref={iframeRef}
      id="contentPlayer"
      name="contentPlayer"
      className="content-player-embed"
      title="Content Player"
      aria-label="Content Player"
      allow="autoplay"
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
};
