import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTelemetry } from './useTelemetry';

interface InteractData {
  id: string;
  type?: string;
  subtype?: string;
  pageid?: string;
  extra?: Record<string, any>;
  object?: { id: string; type: string; ver?: string };
  cdata?: Array<{ id: string; type: string }>;
}

/**
 * Returns a stable `interact()` callback for programmatic INTERACT events.
 *
 * For simple click tracking, prefer declarative data attributes on the element:
 *   <button data-edataid="my-action" data-pageid="HomePage">Click</button>
 * Those are picked up automatically by TelemetryProvider's global listener.
 *
 * Use this hook when you need dynamic data (search query, object ids, cdata)
 * that can't be expressed as static HTML attributes.
 */
const useInteract = () => {
  const location = useLocation();
  const telemetry = useTelemetry();

  const interact = useCallback(
    ({ id, type = 'CLICK', subtype, pageid, extra, object, cdata }: InteractData) => {
      void telemetry.interact({
        edata: {
          type,
          id,
          ...(subtype && { subtype }),
          pageid: pageid || location.pathname,
          ...(extra && { extra }),
        },
        ...(object && { object }),
        ...(cdata && { context: { cdata } }),
      });
    },
    [telemetry, location.pathname],
  );

  return { interact };
};

export default useInteract;
