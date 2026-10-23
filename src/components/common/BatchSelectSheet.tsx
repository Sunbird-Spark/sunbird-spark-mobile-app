import { useEffect } from 'react';
import { IonModal, IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import type { BatchListItem } from '../../types/collectionTypes';
import './BatchSelectSheet.css';

export interface BatchSelectSheetProps {
  isOpen: boolean;
  onClose: () => void;
  batches: BatchListItem[];
  /** Batch-list request in flight. */
  loading: boolean;
  /** Batch-list request failed. */
  error?: string;
  selectedBatchId: string;
  onSelect: (batchId: string) => void;
  onConfirm: () => void;
  /** Enrol mutation in flight. */
  confirming: boolean;
  /** Enrol mutation failed. */
  confirmError?: string;
  title?: string;
  ctaLabel?: string;
  /** Escape hatch for per-page visual overrides. */
  className?: string;
}

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"
      fill="var(--ion-color-primary)"
    />
  </svg>
);

const ChevronIcon = () => (
  <svg className="bs-select-icon" width="14" height="8" viewBox="0 0 14 8" fill="none">
    <path
      d="M1 1L7 7L13 1"
      stroke="var(--ion-color-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Bottom sheet that lets a learner pick a batch and confirm enrolment.
 * Shared by CollectionPage (courses) and LearningPathPage (paths) — purely
 * presentational, so selection state and the enrol mutation stay in the pages.
 */
const BatchSelectSheet: React.FC<BatchSelectSheetProps> = ({
  isOpen,
  onClose,
  batches,
  loading,
  error,
  selectedBatchId,
  onSelect,
  onConfirm,
  confirming,
  confirmError,
  title,
  ctaLabel,
  className,
}) => {
  const { t } = useTranslation();

  // With a single batch there is nothing to choose, so pre-select it — otherwise
  // the sheet opens with its CTA greyed out and looks broken. Guarded on
  // !selectedBatchId so it never overrides a choice the user already made.
  useEffect(() => {
    if (isOpen && !selectedBatchId && batches.length === 1) {
      onSelect(batches[0].identifier);
    }
  }, [isOpen, selectedBatchId, batches, onSelect]);

  const hasBatches = batches.length > 0;
  const isCtaDisabled = !selectedBatchId || confirming;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={1}
      breakpoints={[0, 1]}
      className={className ? `bs-sheet ${className}` : 'bs-sheet'}
    >
      <div className="bs-inner">
        <div className="bs-header">
          <h2>{title ?? t('collection.availableBatches')}</h2>
          <button type="button" className="bs-close" onClick={onClose} aria-label={t('close')}>
            <CloseIcon />
          </button>
        </div>

        <div className="bs-body">
          {loading && (
            <div className="bs-spinner">
              <IonSpinner name="crescent" />
            </div>
          )}

          {!loading && error && <p className="bs-error">{error}</p>}

          {!loading && !error && !hasBatches && (
            <p className="bs-empty">{t('collection.noBatchesAvailable')}</p>
          )}

          {!loading && !error && hasBatches && (
            <>
              <p className="bs-subtitle">{t('collection.selectBatchToStart')}</p>
              <div className="bs-select-container">
                <select
                  className="bs-select"
                  value={selectedBatchId}
                  onChange={(e) => onSelect(e.target.value)}
                  aria-label={t('collection.selectBatch')}
                >
                  {batches.length > 1 && (
                    <option value="" disabled hidden>
                      {t('collection.selectBatch')}
                    </option>
                  )}
                  {batches.map((batch) => (
                    <option key={batch.identifier} value={batch.identifier}>
                      {batch.name ?? batch.identifier}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </>
          )}
        </div>

        {/* Footer sits outside .bs-body so an enrol failure and the CTA are
            always visible, even when the body scrolls. */}
        <div className="bs-footer">
          {confirmError && <p className="bs-error">{confirmError}</p>}
          <button
            type="button"
            className="bs-cta"
            disabled={isCtaDisabled}
            onClick={onConfirm}
          >
            {confirming ? (
              <IonSpinner name="crescent" style={{ width: 18, height: 18, color: 'white' }} />
            ) : (
              <span className="bs-cta-text">{ctaLabel ?? t('collection.joinTheBatch')}</span>
            )}
          </button>
        </div>
      </div>
    </IonModal>
  );
};

export default BatchSelectSheet;
