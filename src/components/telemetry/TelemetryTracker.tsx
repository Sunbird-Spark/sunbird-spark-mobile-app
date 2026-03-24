import { useEffect, useRef } from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';
import { deviceService } from '../../services/device/deviceService';
import type { TelemetryEventInput } from '../../services/TelemetryContext';

interface TelemetryTrackerOptions {
  object?: TelemetryEventInput['object'];
  context?: TelemetryEventInput['context'];
}

interface TelemetryTrackerProps {
  startEventInput?: Record<string, any>;
  endEventInput?: Record<string, any>;
  startOptions?: TelemetryTrackerOptions;
  endOptions?: TelemetryTrackerOptions;
  /** A11: object passed into SUMMARY event alongside END. */
  summaryOptions?: TelemetryTrackerOptions;
  /** When true, START event is suppressed until data is ready. */
  disabled?: boolean;
}

/**
 * Fires START on content/collection load, END + SUMMARY on unmount or beforeunload.
 * Guards against React StrictMode's fake mount/unmount cycle.
 * B18: dspec (device spec) is included automatically in START edata.
 * A11: SUMMARY is fired alongside END with aggregated session stats.
 */
export const TelemetryTracker: React.FC<TelemetryTrackerProps> = ({
  startEventInput,
  endEventInput,
  startOptions,
  endOptions,
  summaryOptions,
  disabled,
}) => {
  const telemetry = useTelemetry();
  const hasStarted = useRef(false);
  const hasEnded = useRef(false);
  // A11: track session start wall-clock time for timespent calculation
  const startTimeRef = useRef<number>(0);

  const endEventInputRef = useRef(endEventInput);
  useEffect(() => { endEventInputRef.current = endEventInput; }, [endEventInput]);

  const endOptionsRef = useRef(endOptions);
  useEffect(() => { endOptionsRef.current = endOptions; }, [endOptions]);

  const summaryOptionsRef = useRef(summaryOptions);
  useEffect(() => { summaryOptionsRef.current = summaryOptions; }, [summaryOptions]);

  const telemetryRef = useRef(telemetry);
  useEffect(() => { telemetryRef.current = telemetry; }, [telemetry]);

  // Fire START once disabled flips to false — B18: include dspec
  useEffect(() => {
    if (disabled) return;
    if (startEventInput && !hasStarted.current) {
      hasStarted.current = true;
      startTimeRef.current = Date.now();
      const dspec = deviceService.getSpec();
      void telemetryRef.current.start(
        { ...startEventInput, dspec },
        '', '', {},
        startOptions,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  useEffect(() => {
    // StrictMode guard: fake unmount is synchronous, genuine unmount happens after at least one tick.
    let isStableMount = false;
    const stableTimer = setTimeout(() => { isStableMount = true; }, 0);

    const fireEnd = () => {
      if (endEventInputRef.current && !hasEnded.current) {
        hasEnded.current = true;
        void telemetryRef.current.end({
          edata: endEventInputRef.current,
          ...endOptionsRef.current,
        });
        // A11: fire SUMMARY alongside END
        const startTime = startTimeRef.current || Date.now();
        const endTime = Date.now();
        const timespent = (endTime - startTime) / 1000;
        void telemetryRef.current.summary({
          edata: {
            type: 'content',
            mode: 'play',
            starttime: Math.floor(startTime / 1000),
            endtime: Math.floor(endTime / 1000),
            timespent,
            pageviews: 1,
            interactions: 0,
          },
          ...summaryOptionsRef.current,
        });
      }
    };

    const handleUnload = () => fireEnd();
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearTimeout(stableTimer);
      window.removeEventListener('beforeunload', handleUnload);
      if (isStableMount) {
        fireEnd();
      } else {
        // StrictMode fake unmount — reset so real mount can fire START/END
        hasStarted.current = false;
        hasEnded.current = false;
        startTimeRef.current = 0;
      }
    };
  }, []);

  return null;
};
