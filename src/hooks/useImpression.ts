import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTelemetry, type TelemetryEventInput } from './useTelemetry';
import { navigationHelperService } from '../services/NavigationHelperService';

interface ImpressionData {
  type?: string;
  subtype?: string;
  pageid?: string;
  env?: string;
  object?: Record<string, unknown>;
  visits?: Array<{ objid: string; objtype: string; objver?: string; index: number }>;
  pageexit?: boolean;
}

const useImpression = ({
  type = 'view',
  subtype,
  pageid,
  env,
  object = {},
  visits,
  pageexit,
}: ImpressionData) => {
  const location = useLocation();
  const { pathname, search, hash } = location;
  const telemetry = useTelemetry();
  const telemetryRef = useRef(telemetry);
  useEffect(() => { telemetryRef.current = telemetry; }, [telemetry]);

  const visitsRef = useRef(visits);
  useEffect(() => { visitsRef.current = visits; }, [visits]);

  const fullUrl = pathname + search + hash;
  const fullUrlRef = useRef(fullUrl);
  useEffect(() => { fullUrlRef.current = fullUrl; }, [fullUrl]);

  const effectivePageId = pageid || pathname;
  const effectivePageIdRef = useRef(effectivePageId);
  useEffect(() => { effectivePageIdRef.current = effectivePageId; }, [effectivePageId]);

  const objectRef = useRef(object);
  useEffect(() => { objectRef.current = object; }, [object]);

  const envRef = useRef(env);
  useEffect(() => { envRef.current = env; }, [env]);

  const pageexitRef = useRef(pageexit);
  useEffect(() => { pageexitRef.current = pageexit; }, [pageexit]);

  // ── Main impression — fires on each navigation ───────────────────────────
  useEffect(() => {
    const isNewUrl = navigationHelperService.storeUrlHistory(fullUrl);
    if (!isNewUrl) return;

    const duration = parseFloat(navigationHelperService.getPageLoadTime().toFixed(3));

    const edata: Record<string, unknown> = {
      type,
      pageid: effectivePageId,
      uri: fullUrl,
      duration,
    };
    if (subtype) edata.subtype = subtype;
    if (visitsRef.current?.length) edata.visits = visitsRef.current;

    const impressionInput: Parameters<typeof telemetry.impression>[0] = { edata };
    if (envRef.current) impressionInput.context = { env: envRef.current };
    if (Object.keys(objectRef.current).length > 0) impressionInput.object = objectRef.current as TelemetryEventInput['object'];

    void telemetryRef.current.impression(impressionInput);
    navigationHelperService.resetPageStartTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePageId, fullUrl, (location as typeof location & { key?: string }).key]);

  // ── Pageexit on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!pageexitRef.current) return;
      const exitEdata: Record<string, unknown> = {
        type,
        pageid: effectivePageIdRef.current,
        uri: fullUrlRef.current,
        subtype: 'pageexit',
      };
      const currentVisits = visitsRef.current;
      if (currentVisits && currentVisits.length > 0) exitEdata.visits = currentVisits;

      const exitInput: Parameters<typeof telemetry.impression>[0] = { edata: exitEdata };
      if (envRef.current) exitInput.context = { env: envRef.current };
      if (Object.keys(objectRef.current).length > 0) exitInput.object = objectRef.current as any;

      void telemetryRef.current.impression(exitInput);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useImpression;
