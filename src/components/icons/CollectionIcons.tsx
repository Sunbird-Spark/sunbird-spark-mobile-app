import React from 'react';

export const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 18L9 12L15 6" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = () => (
  <svg width="19" height="19" viewBox="0 0 19 19" fill="var(--ion-color-primary)">
    <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
  </svg>
);

export const ShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z" fill="var(--ion-color-primary)" />
  </svg>
);

export const CheckIcon = () => (
  <svg width="13" height="10" viewBox="0 0 13 10" fill="none" style={{ marginTop: '2px' }}>
    <path d="M4.5 9.5L0.5 5.5L1.91 4.09L4.5 6.67L10.59 0.580002L12 2L4.5 9.5Z" fill="var(--ion-color-primary)" />
  </svg>
);

export const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M12.6667 2.66667H12V1.33333H10.6667V2.66667H5.33333V1.33333H4V2.66667H3.33333C2.59333 2.66667 2.00667 3.26667 2.00667 4L2 13.3333C2 14.0667 2.59333 14.6667 3.33333 14.6667H12.6667C13.4 14.6667 14 14.0667 14 13.3333V4C14 3.26667 13.4 2.66667 12.6667 2.66667ZM12.6667 13.3333H3.33333V6H12.6667V13.3333ZM12.6667 4.66667H3.33333V4H12.6667V4.66667Z" fill="var(--ion-color-primary)" />
  </svg>
);

export const VideoIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M11.3333 4.66667L14.6667 2V10L11.3333 7.33333V10C11.3333 10.7333 10.7333 11.3333 10 11.3333H2C1.26667 11.3333 0.666667 10.7333 0.666667 10V3.33333C0.666667 2.6 1.26667 2 2 2H10C10.7333 2 11.3333 2.6 11.3333 3.33333V4.66667ZM10 9.33333V4H2V9.33333H10Z" fill="var(--ion-color-primary)" />
  </svg>
);

export const DocumentIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M9.33333 1.33333H2.66667C1.93333 1.33333 1.34 1.93333 1.34 2.66667L1.33333 13.3333C1.33333 14.0667 1.92667 14.6667 2.66001 14.6667H11.3333C12.0667 14.6667 12.6667 14.0667 12.6667 13.3333V4.66667L9.33333 1.33333ZM10.6667 12H3.33333V10.6667H10.6667V12ZM10.6667 9.33333H3.33333V8H10.6667V9.33333ZM8.66667 5.33333V2.33333L11.6667 5.33333H8.66667Z" fill="var(--ion-color-primary)" />
  </svg>
);

export const ChevronDownIcon = () => (
  <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
    <path d="M1 1L7 7L13 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronUpIcon = () => (
  <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
    <path d="M13 7L7 1L1 7" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RightArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 0L4.9425 1.0575L9.1275 5.25H0V6.75H9.1275L4.9425 10.9425L6 12L12 6L6 0Z" fill="currentColor" />
  </svg>
);
