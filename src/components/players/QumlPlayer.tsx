import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  mode = 'play',
  cdata,
  contextRollup,
  objectRollup,
  onPlayerEvent,
  onTelemetryEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerElementRef = useRef<HTMLElement | null>(null);

  const contextProps = useMemo<QumlPlayerContextProps>(
    () => ({
      mode,
      ...(cdata && { cdata }),
      ...(contextRollup && { contextRollup }),
      ...(objectRollup && { objectRollup }),
    }),
    [mode, cdata, contextRollup, objectRollup]
  );

  const handlePlayerEvent = useCallback(
    (event: QumlPlayerEvent) => {
      onPlayerEvent?.(event);
    },
    [onPlayerEvent]
  );

  const handleTelemetryEvent = useCallback(
    (event: any) => {
      onTelemetryEvent?.(event);
    },
    [onTelemetryEvent]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let playerElement: HTMLElement | null = null;
    let cancelled = false;

    const initializePlayer = async () => {
      if (!metadata) {
        console.warn('[QumlPlayer] Metadata not available');
        return;
      }

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
  }, [metadata, contextProps, handlePlayerEvent, handleTelemetryEvent]);

  return (
    <div
      className="content-player-embed"
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default QumlPlayer;
