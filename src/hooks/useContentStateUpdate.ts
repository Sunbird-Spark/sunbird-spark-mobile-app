import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useContentStateUpdateMutation } from './useBatch';
import {
  calculateContentProgress,
  progressToStatus,
} from '../services/course/contentProgressCalculator';
import type { ConsumptionSummary } from '../services/course/contentProgressCalculator';
import { useAuth } from '../contexts/AuthContext';

interface UseContentStateUpdateParams {
  collectionId: string | undefined;
  contentId: string | undefined;
  effectiveBatchId: string | undefined;
  isEnrolledInCurrentBatch: boolean;
  /** When true, no state update API calls are made (batch end date has passed; content is view-only). */
  isBatchEnded?: boolean;
  mimeType: string | undefined;
  /** If 2 (completed), no API calls for progress; SelfAssess still sends assessment PATCH to record attempts. */
  currentContentStatus?: number;
  /** When true (e.g. creator viewing own collection), no progress/state API calls are made. */
  skipContentStateUpdate?: boolean;
  contentType?: string;
}

type TelemetryEvent = {
  eid?: string;
  type?: string;
  ets?: number;
  edata?: { summary?: ConsumptionSummary[]; score?: number;[key: string]: unknown };
  summary?: ConsumptionSummary | ConsumptionSummary[];
  data?: string | {
    eid?: string;
    ets?: number;
    edata?: { summary?: ConsumptionSummary[]; score?: number;[key: string]: unknown };
    summary?: ConsumptionSummary | ConsumptionSummary[];
    score?: number;
    [key: string]: unknown;
  };
};

function eventHasScore(event: TelemetryEvent | undefined): boolean {
  if (!event) return false;
  const raw = event?.data ?? event;
  if (typeof raw === 'string') return false;
  const rawData = raw as Record<string, unknown>;
  if (typeof (rawData?.edata as { score?: number } | undefined)?.score === 'number') return true;
  if (typeof (rawData as { score?: number })?.score === 'number') return true;
  const summary = (rawData?.edata as any)?.summary ?? (rawData as any)?.summary;
  const arr = Array.isArray(summary) ? summary : summary ? [summary] : [];
  return arr.some(
    (s: any) => typeof s?.score === 'number',
  );
}

function extractSummary(event: TelemetryEvent): ConsumptionSummary[] {
  const raw = event?.data ?? event;
  if (typeof raw === 'string') return [];
  const rawData = raw as any;
  const rawSummary = rawData?.edata?.summary ?? rawData?.summary;
  return Array.isArray(rawSummary) ? rawSummary : rawSummary ? [rawSummary] : [];
}

export function useContentStateUpdate({
  collectionId,
  contentId,
  effectiveBatchId,
  isEnrolledInCurrentBatch,
  isBatchEnded = false,
  mimeType,
  currentContentStatus,
  skipContentStateUpdate = false,
  contentType,
}: UseContentStateUpdateParams): (event: TelemetryEvent) => void {
  const queryClient = useQueryClient();
  const { mutateAsync: contentStateUpdate } = useContentStateUpdateMutation();
  const { userId } = useAuth();
  const lastSentStatusRef = useRef<number | null>(null);
  const startUpdateInFlightRef = useRef(false);

  const assessmentTsRef = useRef<number | null>(null);
  const assessEventsRef = useRef<unknown[]>([]);
  const sendingAssessmentRef = useRef(false);

  // Use refs for values that change after content state updates to keep the
  // returned telemetry callback identity stable.
  const currentContentStatusRef = useRef(currentContentStatus);
  useEffect(() => { currentContentStatusRef.current = currentContentStatus; }, [currentContentStatus]);
  const contentTypeRef = useRef(contentType);
  useEffect(() => { contentTypeRef.current = contentType; }, [contentType]);

  // Reset refs when contentId changes
  useEffect(() => {
    lastSentStatusRef.current = null;
    startUpdateInFlightRef.current = false;
    assessmentTsRef.current = null;
    assessEventsRef.current = [];
    sendingAssessmentRef.current = false;
  }, [contentId]);

  const handleContentStateUpdate = useCallback(
    async (status: number, invalidate: boolean) => {
      if (!collectionId || !contentId || !effectiveBatchId) return;
      if (!userId) return;
      try {
        await contentStateUpdate({
          userId,
          courseId: collectionId,
          batchId: effectiveBatchId,
          contents: [{ contentId, status }],
        });
        if (invalidate) {
          await queryClient.invalidateQueries({ queryKey: ['contentState'] });
        }
      } catch (err) {
        console.error('Content state update failed:', err);
      }
    },
    [collectionId, contentId, effectiveBatchId, userId, queryClient, contentStateUpdate],
  );

  const sendAssessmentAndInvalidate = useCallback(async () => {
    if (!collectionId || !contentId || !effectiveBatchId) return;
    if (!userId) return;
    const ts = assessmentTsRef.current;
    if (ts == null) return;
    const events = assessEventsRef.current;
    const attemptId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${collectionId}-${effectiveBatchId}-${contentId}-${userId}-${Date.now()}`;
    try {
      const now = new Date();
      const pad = (n: number, w = 2) => String(n).padStart(w, '0');
      const lastAccessTime = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}:${pad(now.getUTCMilliseconds(), 3)}+0000`;
      await contentStateUpdate({
        userId,
        courseId: collectionId,
        batchId: effectiveBatchId,
        contents: [{
          contentId,
          status: 2,
          lastAccessTime,
        }],
        assessments: [{
          assessmentTs: ts,
          batchId: effectiveBatchId,
          courseId: collectionId,
          userId,
          attemptId,
          contentId,
          events: Array.isArray(events) ? events : [],
        }],
      });
      await queryClient.invalidateQueries({ queryKey: ['contentState'] });
    } catch (err) {
      console.error('Assessment state update failed:', err);
    } finally {
      assessmentTsRef.current = null;
      assessEventsRef.current = [];
      sendingAssessmentRef.current = false;
    }
  }, [collectionId, contentId, effectiveBatchId, userId, queryClient, contentStateUpdate]);

  return useCallback(
    (event: TelemetryEvent) => {
      if (skipContentStateUpdate) return;
      if (!isEnrolledInCurrentBatch || !collectionId || !contentId || !effectiveBatchId) return;
      if (isBatchEnded) return;

      const isSelfAssess = (contentTypeRef.current ?? '').toLowerCase() === 'selfassess';
      if (!isSelfAssess && currentContentStatusRef.current === 2) return;

      const rawEvent = event?.data ?? event;
      const eid = typeof rawEvent === 'string'
        ? ''
        : (event?.eid ?? (event?.data as any)?.eid ?? event?.type ?? '') as string;
      const eidUpper = eid.toUpperCase();

      // renderer:question:submitscore for SelfAssess content
      if (isSelfAssess && event?.data === 'renderer:question:submitscore') {
        if (assessmentTsRef.current != null && !sendingAssessmentRef.current) {
          sendingAssessmentRef.current = true;
          void sendAssessmentAndInvalidate();
          lastSentStatusRef.current = null;
          return;
        }
      }

      if (eidUpper === 'START') {
        const ets = (rawEvent as any)?.ets ?? event?.ets;
        if (ets != null) assessmentTsRef.current = ets;
        assessEventsRef.current = [];
        if (currentContentStatusRef.current !== 2 && lastSentStatusRef.current !== 1 && !startUpdateInFlightRef.current) {
          startUpdateInFlightRef.current = true;
          handleContentStateUpdate(1, true)
            .then(() => {
              lastSentStatusRef.current = 1;
            })
            .catch(() => {
              // Ref left null so next START retries
            })
            .finally(() => {
              startUpdateInFlightRef.current = false;
            });
        }
        return;
      }

      if (eidUpper === 'ASSESS') {
        const rawEventData = event?.data ?? event;
        assessEventsRef.current = [...assessEventsRef.current, rawEventData ?? event];
        return;
      }

      if (eidUpper === 'END') {
        const summary = extractSummary(event);

        if (isSelfAssess) {
          const mergedSummary = (summary as ConsumptionSummary[]).reduce<ConsumptionSummary>(
            (acc, s) => ({ ...acc, ...s }), {},
          );
          const endPageSeen = Boolean(mergedSummary.endpageseen || mergedSummary.visitedcontentend);
          const hasScore =
            eventHasScore(event) ||
            assessEventsRef.current.some((e) => eventHasScore(e as TelemetryEvent));

          if (
            hasScore &&
            endPageSeen &&
            assessmentTsRef.current != null &&
            !sendingAssessmentRef.current
          ) {
            sendingAssessmentRef.current = true;
            void sendAssessmentAndInvalidate();
            lastSentStatusRef.current = null;
            return;
          }

          // Completion criteria not met; do not regress an already-completed content.
          if (currentContentStatusRef.current === 2) return;
          const effectiveProgress = calculateContentProgress(summary as ConsumptionSummary[], mimeType ?? '');
          const statusFromProgress = progressToStatus(effectiveProgress);
          const status = Math.min(statusFromProgress, 1); // Cap at 1 for SelfAssess without score
          if (status === 0 && lastSentStatusRef.current === 1) {
            void handleContentStateUpdate(1, true);
          } else {
            lastSentStatusRef.current = null;
            void handleContentStateUpdate(status, true);
          }
          return;
        }

        // Non-SelfAssess
        const effectiveProgress = calculateContentProgress(summary as ConsumptionSummary[], mimeType ?? '');
        let status = progressToStatus(effectiveProgress);
        if (status === 0 && lastSentStatusRef.current === 1) status = 1;
        lastSentStatusRef.current = null;
        void handleContentStateUpdate(status, true);
      }
    },
    [
      skipContentStateUpdate,
      isEnrolledInCurrentBatch,
      isBatchEnded,
      collectionId,
      contentId,
      effectiveBatchId,
      mimeType,
      handleContentStateUpdate,
      sendAssessmentAndInvalidate,
    ],
  );
}
