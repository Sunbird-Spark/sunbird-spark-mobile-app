import React from 'react';
import { useTranslation } from 'react-i18next';
import { currentUser } from '../../../data/mockData';

export const LearningGreeting: React.FC = () => {
  const { t } = useTranslation();
  const firstName = currentUser.name.split(' ')[0];

  return (
    <div style={{ padding: '20px 16px 8px' }}>
      <h1 style={{
        fontFamily: 'var(--ion-font-family)',
        fontSize: '20px',
        fontWeight: 500,
        color: 'var(--ion-color-dark, var(--color-222222, #222222))',
        margin: '0 0 4px 0',
      }}>
        {t('greeting', { name: firstName })}
      </h1>
      <p style={{
        fontFamily: 'var(--ion-font-family)',
        fontSize: '14px',
        fontWeight: 400,
        color: 'var(--ion-color-medium, var(--color-757575, #757575))',
        margin: 0,
      }}>
        {t('learningJourneySubtitle')}
      </p>
    </div>
  );
};
