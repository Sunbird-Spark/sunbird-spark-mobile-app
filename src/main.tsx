import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './config/i18n';
import './index.css';
import { NetworkProvider } from './providers/NetworkProvider';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { QueryProvider } from './providers/QueryProvider';
import { TelemetryProvider } from './providers/TelemetryProvider';

import OfflineBanner from './components/common/OfflineBanner';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <QueryProvider>
      <NetworkProvider>
        <AuthProvider>
          <TelemetryProvider>
            <LanguageProvider>
              <OfflineBanner />
              <App />
            </LanguageProvider>
          </TelemetryProvider>
        </AuthProvider>
      </NetworkProvider>
    </QueryProvider>
  </React.StrictMode>,
);
