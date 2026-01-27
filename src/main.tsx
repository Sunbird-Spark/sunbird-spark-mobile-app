import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './config/i18n';
import './index.css';
import { NetworkProvider } from './providers/NetworkProvider';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <NetworkProvider>
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </NetworkProvider>
  </React.StrictMode>,
);
