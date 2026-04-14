import React, { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';

interface MobileLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  hideNav = false
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <div style={{
        flex: 1,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {children}
      </div>
      {!hideNav && <BottomNavigation />}
    </div>
  );
};
