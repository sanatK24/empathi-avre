function VerificationBadge({ verificationStatus }) {
  const statusClass = {
    pending: 'status-pending',
    verified: 'status-verified',
    rejected: 'status-rejected',
    needs_more_info: 'status-warning',
  }[verificationStatus] || 'status-pending'

  const statusLabel = {
    pending: 'Pending Verification',
    verified: 'Verified',
    rejected: 'Verification Rejected',
    needs_more_info: 'Needs More Info',
  }[verificationStatus] || 'Pending'

  return (
    <div className={`verification-badge ${statusClass}`}>
      <span className="badge-icon">✓</span>
      <div className="badge-content">
        <strong>{statusLabel}</strong>
      </div>
    </div>
  )
}

export default VerificationBadge
