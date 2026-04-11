function EmergencyFundProgressCard({ fundData }) {
  const { accumulatedTotal, allocatedTotal, availableBalance } = fundData || {
    accumulatedTotal: 0,
    allocatedTotal: 0,
    availableBalance: 0,
  }

  const percentageAllocated = accumulatedTotal > 0 ? (allocatedTotal / accumulatedTotal) * 100 : 0

  return (
    <div className="emergency-fund-card">
      <h3>Emergency Fund Status</h3>
      <div className="fund-stats">
        <div className="stat">
          <span>Accumulated</span>
          <strong>₹{accumulatedTotal.toFixed(2)}</strong>
        </div>
        <div className="stat">
          <span>Allocated</span>
          <strong>₹{allocatedTotal.toFixed(2)}</strong>
        </div>
        <div className="stat highlight">
          <span>Available</span>
          <strong>₹{availableBalance.toFixed(2)}</strong>
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill allocated"
          style={{ width: `${percentageAllocated}%` }}
        />
      </div>
      <small>{percentageAllocated.toFixed(1)}% allocated</small>
    </div>
  )
}

export default EmergencyFundProgressCard
