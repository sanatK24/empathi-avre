import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { AppProvider } from './context/AppContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { NotificationProvider } from './context/NotificationContext';
import { ResourceProvider } from './context/ResourceContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <AppProvider>
        <EmergencyProvider>
          <NotificationProvider>
            <ResourceProvider>
              <App />
            </ResourceProvider>
          </NotificationProvider>
        </EmergencyProvider>
      </AppProvider>
  </React.StrictMode>,
)
