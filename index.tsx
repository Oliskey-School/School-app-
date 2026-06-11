import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, idbPersister } from './lib/react-query';
import App from './App';
import './index.css';
import './lib/i18n'; // initialize app-wide translations + RTL before first render
import { startAutoTranslate } from './lib/i18n/autoTranslate'; // whole-app live translation
import { initSentry } from './lib/sentry';
// @ts-ignore
// import { registerSW } from 'virtual:pwa-register';

// Start crash reporting as early as possible (no-op unless VITE_SENTRY_DSN is set).
initSentry();

// Begin translating every rendered screen into the user's chosen language.
// No-op while the language is English; activates the moment a language is picked.
startAutoTranslate();

// Register PWA Service Worker for extremely fast loading
// Service worker is registered via UpdatePrompt component in App.tsx

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { BranchProvider } from './context/BranchContext';
import { SocketProvider } from './context/SocketContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: idbPersister }}>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <BranchProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </BranchProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);