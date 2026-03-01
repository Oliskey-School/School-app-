import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, idbPersister } from './lib/react-query';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for extremely fast loading
const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: show a prompt to user to refresh
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { BranchProvider } from './context/BranchContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: idbPersister }}>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <BranchProvider>
              <App />
            </BranchProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);