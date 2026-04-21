import { createContext, useContext, useMemo, useState } from 'react'

const EmergencyContext = createContext(null)

function getInitialEmergencyState() {
  try {
    const saved = localStorage.getItem('empathi_emergency')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore malformed data
  }

  return {
    emergencyModeActive: false,
    emergencyScope: null, // geographic scope (city/state/national)
    emergencyReason: '',
  }
}

export function EmergencyProvider({ children }) {
  const [state, setState] = useState(getInitialEmergencyState)

  const updateState = (patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem('empathi_emergency', JSON.stringify(next))
      return next
    })
  }

  const activateEmergencyMode = (scope, reason = '') => {
    updateState({
      emergencyModeActive: true,
      emergencyScope: scope,
      emergencyReason: reason,
    })
  }

  const deactivateEmergencyMode = () => {
    updateState({
      emergencyModeActive: false,
      emergencyScope: null,
      emergencyReason: '',
    })
  }

  const value = useMemo(
    () => ({
      ...state,
      activateEmergencyMode,
      deactivateEmergencyMode,
      updateState,
    }),
    [state, activateEmergencyMode, deactivateEmergencyMode],
  )

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  )
}

export function useEmergencyContext() {
  const context = useContext(EmergencyContext)
  if (!context) {
    throw new Error('useEmergencyContext must be used inside EmergencyProvider')
  }
  return context
}
