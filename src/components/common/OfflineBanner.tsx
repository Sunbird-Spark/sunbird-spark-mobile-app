import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNetwork } from '../../providers/NetworkProvider';
import './OfflineBanner.css';

/**
 * OfflineBanner
 *
 * Renders a fixed red "No internet connection" strip at the top of every
 * routed page. It slides in and pushes the app content down.
 */
const BACK_ONLINE_DURATION_MS = 2500;

const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isOffline } = useNetwork();
  const [backOnline, setBackOnline] = useState(false);
  const backOnlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOfflineRef = useRef(isOffline);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wasOffline = prevOfflineRef.current;
    prevOfflineRef.current = isOffline;

    if (wasOffline && !isOffline) {
      setTimeout(() => {
        setBackOnline(true);
        if (backOnlineTimerRef.current) clearTimeout(backOnlineTimerRef.current);
        backOnlineTimerRef.current = setTimeout(() => {
          setBackOnline(false);
        }, BACK_ONLINE_DURATION_MS);
      }, 0);
    }

    if (isOffline) {
      setTimeout(() => {
        if (backOnlineTimerRef.current) {
          clearTimeout(backOnlineTimerRef.current);
          backOnlineTimerRef.current = null;
        }
        setBackOnline(false);
      }, 0);
    }

    return () => {
      if (backOnlineTimerRef.current) {
        clearTimeout(backOnlineTimerRef.current);
      }
    };
  }, [isOffline]);

  const visible = isOffline || backOnline;

  // Sync banner visibility with global application state to allow "push down" transition
  useEffect(() => {
    document.documentElement.classList.toggle('has-offline-banner', visible);
    
    if (visible && bannerRef.current) {
      const height = bannerRef.current.offsetHeight;
      document.documentElement.style.setProperty('--offline-banner-height', `${height}px`);
    } else {
      document.documentElement.style.setProperty('--offline-banner-height', '0px');
    }
  }, [visible]);

  return (
    <div
      ref={bannerRef}
      className={`offline-banner ${visible ? 'offline-banner--visible' : ''} ${backOnline ? 'offline-banner--online' : ''}`}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <span className="offline-banner__icon" aria-hidden="true">
        {backOnline ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.1" fill="currentColor" />
          </svg>
        )}
      </span>
      <span className="offline-banner__text">
        {backOnline ? t('offlineBanner.backOnline') : t('offlineBanner.noInternet')}
      </span>
    </div>
  );
};

export default OfflineBanner;
