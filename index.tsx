import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, idbPersister } from './lib/react-query';
import App from './App';
import './index.css';
import './lib/i18n'; // initialize app-wide translations + RTL before first render
import { startAutoTranslate } from './lib/i18n/autoTranslate'; // whole-app live translation
import { initSentry } from './lib/sentry';
import { initLiquidGlass } from './components/shared/LiquidGlassControl';
// @ts-ignore
// import { registerSW } from 'virtual:pwa-register';

// Capture the PWA install prompt as EARLY as possible. The browser fires
// `beforeinstallprompt` once, shortly after the page becomes installable — long
// before the (lazy-loaded) install card mounts. We stash the event on `window` so
// the install button can fire the REAL native install later. Without this eager
// capture the event is missed entirely and "Install" never installs anything.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__deferredInstallPrompt = e;
    window.dispatchEvent(new Event('pwa-install-available'));
  });
  window.addEventListener('appinstalled', () => {
    (window as any).__deferredInstallPrompt = null;
    window.dispatchEvent(new Event('pwa-installed'));
  });
}

// Start crash reporting as early as possible (no-op unless VITE_SENTRY_DSN is set).
initSentry();

// Apply the owner's saved Liquid Glass appearance before first paint (no-op on defaults).
initLiquidGlass();

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