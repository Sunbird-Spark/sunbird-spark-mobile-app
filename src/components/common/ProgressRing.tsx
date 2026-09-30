import React from 'react';

interface ProgressRingProps {
  progress: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  fillColor?: string;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

/**
 * Shared circular progress indicator. Three near-identical private copies of
 * this already exist (`ProgressRing` in `ProfileLearningPage.tsx`,
 * `DonutChart` in `MyLearningPage.tsx`, `ItemProgressRing` in
 * `CollectionAccordion.tsx`) — new Learning Path UI (status hero, My Skills
 * hero, course rows) uses this one instead of adding a fourth.
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 26,
  stroke = 3,
  trackColor = 'var(--color-e0e0e0, #e0e0e0)',
  fillColor = 'var(--ion-color-primary)',
  className,
  ariaLabel,
  children,
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg width={size} height={size} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && (
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
