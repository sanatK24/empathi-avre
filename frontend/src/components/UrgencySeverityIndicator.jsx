function UrgencySeverityIndicator({ urgencyScore, deadline, compactMode = false }) {
  const urgencyLevel = urgencyScore >= 90 ? 'critical' : urgencyScore >= 70 ? 'high' : urgencyScore >= 40 ? 'medium' : 'low'

  const labels = {
    critical: { label: 'CRITICAL', icon: '🔴' },
    high: { label: 'HIGH', icon: '🟠' },
    medium: { label: 'MEDIUM', icon: '🟡' },
    low: { label: 'LOW', icon: '🟢' },
  }

  const { label, icon } = labels[urgencyLevel]

  if (compactMode) {
    return (
      <span className={`urgency-indicator compact ${urgencyLevel}`}>
        {icon} {label}
      </span>
    )
  }

  return (
    <div className={`urgency-indicator ${urgencyLevel}`}>
      <div className="urgency-header">
        <span className="icon">{icon}</span>
        <strong>{label} URGENCY</strong>
      </div>
      <div className="urgency-score">Score: {urgencyScore.toFixed(1)}/100</div>
      {deadline && (
        <div className="urgency-deadline">
          Deadline: {new Date(deadline).toLocaleString()}
        </div>
      )}
    </div>
  )
}

export default UrgencySeverityIndicator
