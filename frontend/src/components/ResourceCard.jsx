function ResourceCard({ resource, type = 'availability' }) {
  const { resourceType, quantity, unit, location, urgencyLevel } = resource

  return (
    <div className="resource-card">
      <div className="resource-header">
        <span className={`resource-type-badge ${resourceType}`}>{resourceType}</span>
        {type === 'request' && (
          <span className={`urgency-badge urgency-${urgencyLevel}`}>{urgencyLevel}</span>
        )}
      </div>

      <div className="resource-body">
        <p className="quantity">
          <strong>{quantity} {unit}</strong>
        </p>

        {location && (
          <p className="location">
            📍 {location.address || `${location.lat}, ${location.lng}`}
          </p>
        )}

        {resource.expiryDate && (
          <p className="expiry-date">Expires: {new Date(resource.expiryDate).toLocaleDateString()}</p>
        )}

        {resource.verified && <p className="verified-badge">✓ Verified</p>}
      </div>
    </div>
  )
}

export default ResourceCard
