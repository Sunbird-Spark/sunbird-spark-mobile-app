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
        color: 'rgb(34, 34, 34)',
        margin: '0 0 4px 0',
      }}>
        Hi {firstName}
      </h1>
      <p style={{
        fontFamily: "'Rubik', sans-serif",
        fontSize: '14px',
        fontWeight: 400,
        color: 'rgb(117, 117, 117)',
        margin: 0,
      }}>
        Your exciting learning journey starts here. Dive in!
      </p>
    </div>
  );
};
