import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './config/i18n';
import './index.css';
import { NetworkProvider } from './providers/NetworkProvider';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <NetworkProvider>
        <App />
    </NetworkProvider>
  
  </React.StrictMode>,
);
