function CrisisIndicator({ emergencyModeActive, emergencyScope }) {
  if (!emergencyModeActive) return null

  return (
    <div className="crisis-indicator crisis-banner">
      <span className="crisis-icon">🚨</span>
      <div className="crisis-content">
        <strong>EMERGENCY MODE ACTIVE</strong>
        <p>{emergencyScope ? `Emergency scope: ${emergencyScope}` : 'System in emergency response mode'}</p>
      </div>
    </div>
  )
}

export default CrisisIndicator
