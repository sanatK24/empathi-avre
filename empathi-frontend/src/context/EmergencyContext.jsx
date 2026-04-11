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
    emergencyFund: {
      accumulatedTotal: 0,
      allocatedTotal: 0,
      availableBalance: 0,
    },
    userContributedToEmergencyFund: 0,
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

  const addToEmergencyFund = (amount, _donationAmount = null, percentage = 5) => {
    const emergencyAllocation = amount * (percentage / 100)

    setState((prev) => {
      const next = {
        ...prev,
        emergencyFund: {
          ...prev.emergencyFund,
          accumulatedTotal: prev.emergencyFund.accumulatedTotal + emergencyAllocation,
          availableBalance: prev.emergencyFund.availableBalance + emergencyAllocation,
        },
        userContributedToEmergencyFund:
          prev.userContributedToEmergencyFund + emergencyAllocation,
      }
      localStorage.setItem('empathi_emergency', JSON.stringify(next))
      return next
    })
  }

  const unlockEmergencyFund = (_adminId, amount, _reason = '') => {
    // This would be called by admin when unlocking funds
    updateState((prev) => ({
      ...prev,
      emergencyFund: {
        ...prev.emergencyFund,
        availableBalance:
          prev.emergencyFund.availableBalance + amount,
      },
    }))
  }

  const allocateFromEmergencyFund = (amount, _postId, _adminId) => {
    updateState((prev) => ({
      ...prev,
      emergencyFund: {
        ...prev.emergencyFund,
        allocatedTotal: prev.emergencyFund.allocatedTotal + amount,
        availableBalance: Math.max(0, prev.emergencyFund.availableBalance - amount),
      },
    }))
  }

  const value = useMemo(
    () => ({
      ...state,
      activateEmergencyMode,
      deactivateEmergencyMode,
      addToEmergencyFund,
      unlockEmergencyFund,
      allocateFromEmergencyFund,
      updateState,
    }),
    [state, activateEmergencyMode, deactivateEmergencyMode, addToEmergencyFund, unlockEmergencyFund, allocateFromEmergencyFund],
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
