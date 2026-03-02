import React from 'react';
import { currentUser } from '../../../data/mockData';

export const LearningGreeting: React.FC = () => {
  const firstName = currentUser.name.split(' ')[0];

  return (
    <div style={{ padding: '20px 16px 8px' }}>
      <h1 style={{
        fontFamily: "'Rubik', sans-serif",
        fontSize: '20px',
        fontWeight: 500,
        color: 'var(--ion-color-dark, var(--color-222222, #222222))',
        margin: '0 0 4px 0',
      }}>
        Hi {firstName}
      </h1>
      <p style={{
        fontFamily: "'Rubik', sans-serif",
        fontSize: '14px',
        fontWeight: 400,
        color: 'var(--ion-color-medium, var(--color-757575, #757575))',
        margin: 0,
      }}>
        Your exciting learning journey starts here. Dive in!
      </p>
    </div>
  );
};
