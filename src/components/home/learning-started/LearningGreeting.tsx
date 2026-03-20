import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useUser } from '../../../hooks/useUser';
import { userService } from '../../../services/UserService';

interface LearningGreetingProps {
  enrolledCount: number;
}

export const LearningGreeting: React.FC<LearningGreetingProps> = ({ enrolledCount }) => {
  const { userId } = useAuth();
  const { data: userProfile } = useUser(userId);
  const { t } = useTranslation();

  const name = userService.getDisplayName(userProfile);
  const greeting = name ? t('hiUser', { name }) : t('hiGuest');
  const subtitle = enrolledCount === 0 ? t('journeyStart') : t('welcomeMessage');

  return (
    <div style={{ padding: '20px 16px 8px' }}>
      <h1 style={{
        fontFamily: 'var(--ion-font-family)',
        fontSize: '20px',
        fontWeight: 500,
        color: 'var(--ion-color-dark, var(--color-222222, #222222))',
        margin: '0 0 4px 0',
      }}>
        {greeting}
      </h1>
      <p style={{
        fontFamily: 'var(--ion-font-family)',
        fontSize: '14px',
        fontWeight: 400,
        color: 'var(--ion-color-medium, var(--color-757575, #757575))',
        margin: 0,
      }}>
        {subtitle}
      </p>
    </div>
  );
};
