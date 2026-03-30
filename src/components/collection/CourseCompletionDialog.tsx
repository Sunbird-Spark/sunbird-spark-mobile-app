import { useEffect, useRef, useState } from 'react';
import { IonModal } from '@ionic/react';

interface CourseCompletionDialogProps {
  progressPercentage: number;
  isEnrolled: boolean;
  isEnrollmentLoading: boolean;
  isViewActive: boolean;
  collectionId: string | undefined;
  hasCertificate: boolean;
  /** Progress snapshot taken before the player was opened.
   *  Lets us detect a <100→≥100 transition that happened while this
   *  component was unmounted (player fullscreen replaces the page). */
  progressBeforePlayer: number | null;
  isOffline?: boolean;
}

export default function CourseCompletionDialog({
  progressPercentage,
  isEnrolled,
  isEnrollmentLoading,
  isViewActive,
  collectionId,
  hasCertificate,
  progressBeforePlayer,
  isOffline,
}: CourseCompletionDialogProps) {
  const [open, setOpen] = useState(false);
  const previousProgressRef = useRef<number | null>(null);
  const lastCollectionIdRef = useRef<string | undefined>(undefined);
  const completionShownForCollectionIdsRef = useRef<Set<string>>(new Set());

  // Reset tracking when collection changes
  useEffect(() => {
    if (!collectionId) {
      previousProgressRef.current = null;
      lastCollectionIdRef.current = undefined;
      return;
    }
    if (collectionId !== lastCollectionIdRef.current) {
      lastCollectionIdRef.current = collectionId;
      previousProgressRef.current = null;
      queueMicrotask(() => setOpen(false));
    }
  }, [collectionId]);

  // Detect real completion: only when view is active AND enrollment data has loaded.
  // This prevents false 0→100 transitions during initial data loading or when
  // Ionic page caching causes effects to fire on an inactive (background) page.
  useEffect(() => {
    // Guard 1: view must be the active Ionic view (not cached in background)
    if (!isViewActive) return;
    // Guard 2: enrollment data must have finished loading (prevents false 0→100 from loading state)
    if (isEnrollmentLoading) return;
    // Guard 3: must be enrolled with a valid collection
    if (!isEnrolled || !collectionId) return;

    const currentPercent = progressPercentage;

    // First valid data point after load or after returning from player.
    // Use the pre-player snapshot as the "previous" so we can detect
    // completion that happened while the player was open.
    if (previousProgressRef.current === null) {
      previousProgressRef.current =
        progressBeforePlayer !== null ? progressBeforePlayer : currentPercent;
      // If completion already happened while player was open, trigger now
      if (previousProgressRef.current < 100 && currentPercent >= 100) {
        if (!completionShownForCollectionIdsRef.current.has(collectionId)) {
          completionShownForCollectionIdsRef.current.add(collectionId);
          queueMicrotask(() => setOpen(true));
        }
        previousProgressRef.current = 100;
        return;
      }
      return;
    }
    // Detect real transition: progress went from <100 to >=100 during consumption
    if (previousProgressRef.current < 100 && currentPercent >= 100) {
      if (!completionShownForCollectionIdsRef.current.has(collectionId)) {
        completionShownForCollectionIdsRef.current.add(collectionId);
        queueMicrotask(() => setOpen(true));
      }
      previousProgressRef.current = 100;
      return;
    }
    previousProgressRef.current = currentPercent;
  }, [progressPercentage, isEnrolled, isEnrollmentLoading, isViewActive, collectionId, progressBeforePlayer]);

  return (
    <IonModal
      isOpen={open}
      onDidDismiss={() => setOpen(false)}
      className="cp-completion-dialog"
    >
      <div className="cp-completion-dialog-content">
        <div className="cp-completion-dialog-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="white" />
          </svg>
        </div>

        <h2 className="cp-completion-dialog-title">Congratulations!</h2>

        <p className="cp-completion-dialog-desc">
          You have successfully completed this course.
        </p>

        {!isOffline && (hasCertificate ? (
          <p className="cp-completion-dialog-note">
            You can download your certificate from the Profile page.
          </p>
        ) : (
          <div className="cp-completion-dialog-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 21H23L12 2L1 21ZM13 18H11V16H13V18ZM13 14H11V10H13V14Z" fill="var(--ion-color-warning, #ffc409)" />
            </svg>
            <span>Note: This course does not have a certificate.</span>
          </div>
        ))}

        <button
          className="cp-completion-dialog-btn"
          onClick={() => setOpen(false)}
        >
          Continue
        </button>
      </div>
    </IonModal>
  );
}
