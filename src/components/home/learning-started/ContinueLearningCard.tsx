import React from 'react';
import { getInProgressCourses } from '../../../data/mockData';

const ArrowIcon = () => (
  <svg width="14" height="9" viewBox="0 0 13 9" fill="var(--ion-color-light)" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.5 0L7.09 1.41L9.67 4H0V6H9.67L7.09 8.59L8.5 10L13 5L8.5 0Z" transform="translate(0, -0.5)" />
  </svg>
);

interface CircularProgressProps {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 52,
  strokeWidth = 5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(240, 206, 148)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--ion-color-primary)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

export const ContinueLearningCard: React.FC = () => {
  const inProgressCourses = getInProgressCourses();
  const course = inProgressCourses[0];

  if (!course) return null;

  return (
    <section style={{ padding: '0 16px 16px' }}>
      <h2 style={{
        fontFamily: "'Rubik', sans-serif",
        fontSize: '18px',
        fontWeight: 500,
        color: 'var(--ion-color-dark, var(--color-222222, #222222))',
        margin: '0 0 12px 0',
      }}>
        Continue from where you left
      </h2>

      {/* Card */}
      <div style={{
        backgroundColor: 'var(--ion-color-light)',
        borderRadius: '20px',
        boxShadow: '2px 2px 20px rgba(0, 0, 0, 0.09)',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        minHeight: '200px',
      }}>
        {/* Left: thumbnail */}
        <div style={{
          width: '104px',
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: '15px',
          margin: '15px 0 15px 15px',
        }}>
          <img
            src={course.thumbnail}
            alt={course.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '15px',
            }}
          />
        </div>

        {/* Right: content */}
        <div style={{
          flex: 1,
          padding: '16px 16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {/* Title */}
          <p style={{
            fontFamily: "'Rubik', sans-serif",
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--ion-color-dark, var(--color-222222, #222222))',
            margin: '0 0 12px 0',
            lineHeight: 1.4,
          }}>
            {course.title}
          </p>

          {/* Progress indicator row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
          }}>
            <CircularProgress progress={course.progress} size={26} strokeWidth={3} />
            <p style={{
              fontFamily: "'Rubik', sans-serif",
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--ion-color-dark, var(--color-222222, #222222))',
              margin: 0,
            }}>
              Completed: {course.progress}%
            </p>
          </div>

          {/* Continue Learning button */}
          <button
            style={{
              backgroundColor: 'var(--ion-color-primary)',
              borderRadius: '10px',
              border: 'none',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontFamily: "'Rubik', sans-serif",
              fontSize: '16px',
              fontWeight: 500,
              color: 'var(--ion-color-light)',
            }}>
              Continue Learning
            </span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
};
