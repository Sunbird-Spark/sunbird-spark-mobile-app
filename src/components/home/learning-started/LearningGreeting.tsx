import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useUser } from '../../../hooks/useUser';
import { userService } from '../../../services/UserService';
import './LearningGreeting.css';

interface LearningGreetingProps {
  enrolledCount: number;
}

export const LearningGreeting: React.FC<LearningGreetingProps> = ({ enrolledCount }) => {
  const { userId } = useAuth();
  const { data: userProfile } = useUser(userId);
  const { t } = useTranslation();

  const name = userService.getDisplayName(userProfile);
  const greeting = _.isEmpty(name) ? t('hiGuest') : t('hiUser', { name });
  const subtitle = _.isEqual(enrolledCount, 0) ? t('journeyStart') : t('welcomeMessage');

  return (
    <div className="learning-greeting">
      <h1 className="learning-greeting__title">{greeting}</h1>
      <p className="learning-greeting__subtitle">{subtitle}</p>
    </div>
  );
};
