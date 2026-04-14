import React, { useEffect, useRef } from 'react';
import { qumlPlayerService, QumlPlayerService } from '../../services/players/quml';
import type { QumlPlayerEvent, QumlPlayerContextProps, QumlPlayerMetadata } from '../../services/players/quml/types';

interface QumlPlayerProps {
  metadata: QumlPlayerMetadata;
  mode?: string;
  cdata?: any[];
  contextRollup?: { l1: string };
  objectRollup?: Record<string, any>;
  onPlayerEvent?: (event: QumlPlayerEvent) => void;
  onTelemetryEvent?: (event: any) => void;
}

const QumlPlayer: React.FC<QumlPlayerProps> = ({
  metadata,
  mode,
  cdata,
  contextRollup,
  objectRollup,
  onPlayerEvent,
  onTelemetryEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerElementRef = useRef<HTMLElement | null>(null);

  // Store callbacks in refs so the player init useEffect doesn't re-run
  // when callback identities change (e.g. after content state updates).
  const onPlayerEventRef = useRef(onPlayerEvent);
  useEffect(() => { onPlayerEventRef.current = onPlayerEvent; }, [onPlayerEvent]);
  const onTelemetryEventRef = useRef(onTelemetryEvent);
  useEffect(() => { onTelemetryEventRef.current = onTelemetryEvent; }, [onTelemetryEvent]);

  useEffect(() => {
    if (!containerRef.current) return;

    let playerElement: HTMLElement | null = null;
    let cancelled = false;

    const handlePlayerEvent = (event: QumlPlayerEvent) => {
      onPlayerEventRef.current?.(event);
    };

    const handleTelemetryEvent = (event: any) => {
      onTelemetryEventRef.current?.(event);
    };

    const initializePlayer = async () => {
      if (!metadata) {
        console.warn('[QumlPlayer] Metadata not available');
        return;
      }

      const contextProps: QumlPlayerContextProps = {
        mode: mode || 'play',
        ...(cdata && { cdata }),
        ...(contextRollup && { contextRollup }),
        ...(objectRollup && { objectRollup }),
      };

      try {
        const config = await qumlPlayerService.createConfig(metadata, contextProps);
        if (cancelled) return;

        playerElement = qumlPlayerService.createElement(config);
        qumlPlayerService.attachEventListeners(playerElement, handlePlayerEvent, handleTelemetryEvent);

        if (containerRef.current) {
          containerRef.current.appendChild(playerElement);
          playerElementRef.current = playerElement;
        }
      } catch (error) {
        console.error('[QumlPlayer] Failed to initialize player:', error);
      }
    };

    initializePlayer();

    return () => {
      cancelled = true;
      if (playerElement) {
        qumlPlayerService.removeEventListeners(playerElement);
        playerElement.remove();
        playerElementRef.current = null;
      }
      QumlPlayerService.unloadStyles();
    };
  }, [metadata]);

  return (
    <div
      className="content-player-embed"
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default QumlPlayer;
