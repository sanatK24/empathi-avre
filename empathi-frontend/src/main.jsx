import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { EmergencyProvider } from './context/EmergencyContext'
import { NotificationProvider } from './context/NotificationContext'
import { ResourceProvider } from './context/ResourceContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <EmergencyProvider>
          <NotificationProvider>
            <ResourceProvider>
              <App />
            </ResourceProvider>
          </NotificationProvider>
        </EmergencyProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
