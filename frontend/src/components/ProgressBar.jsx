function ProgressBar({ value }) {
  return (
    <div className="progress-shell" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export default ProgressBar
