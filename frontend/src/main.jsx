import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider } from './context/AppContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { NotificationProvider } from './context/NotificationContext';
import { ResourceProvider } from './context/ResourceContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const hasGoogleClientId = Boolean(GOOGLE_CLIENT_ID);

function RootProviders({ children }) {
  if (!hasGoogleClientId) {
    return children;
  }
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootProviders>
      <AppProvider>
        <EmergencyProvider>
          <NotificationProvider>
            <ResourceProvider>
              <App />
            </ResourceProvider>
          </NotificationProvider>
        </EmergencyProvider>
      </AppProvider>
    </RootProviders>
  </React.StrictMode>,
)
