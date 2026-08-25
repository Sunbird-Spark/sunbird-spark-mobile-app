import React from 'react';
import { IonFooter, IonToolbar } from '@ionic/react';
import { BackIcon } from '../icons/CollectionIcons';
import type { LPTFunction } from './lpTFunction';

interface LPBackFooterProps {
  onBack: () => void;
  t: LPTFunction;
}

/**
 * Bottom "Back" bar for the Learning Path screens, replacing the top-header
 * back chevron those pages used to carry.
 *
 * Why the bottom: on a phone the top-left chevron is the hardest target to
 * reach one-handed, and on gesture-navigation devices (no system back button
 * drawn) it was the only way back — so when it failed to render, the screen
 * was a dead end. A labelled bar at the thumb line is both reachable and
 * unambiguous.
 *
 * Mirrors `lp-player-footer`'s structure (`LearningPathPlayerPage`), including
 * its `z-index` note: the app's bottom tab bar stays mounted underneath these
 * pages, so the footer needs its own stacking context to stay tappable.
 */
export const LPBackFooter: React.FC<LPBackFooterProps> = ({ onBack, t }) => (
  <IonFooter className="lp-back-footer">
    <IonToolbar className="lp-back-footer-toolbar">
      <button onClick={onBack} className="lp-back-footer-btn" aria-label={t('back')}>
        <BackIcon />
        <span>{t('back')}</span>
      </button>
    </IonToolbar>
  </IonFooter>
);

export default LPBackFooter;
