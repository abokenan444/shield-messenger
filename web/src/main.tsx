import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { initNotifications } from './lib/notificationService';
import './styles/globals.css';

// Initialize notification system (Service Worker + Push API)
// This runs asynchronously and does not block rendering.
initNotifications().then((ok) => {
  if (ok) {
    console.log('[SL] Notification system initialized');
  } else {
    console.warn('[SL] Notification system unavailable');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
