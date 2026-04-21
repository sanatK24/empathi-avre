import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getMatchingOptions } from '../services/dataService'

function formatMatchStatus(status) {
  const value = String(status || 'pending').toLowerCase()
  const labelByStatus = {
    pending: 'Pending',
    accepted_by_vendor: 'Vendor Accepted',
    rejected_by_vendor: 'Rejected by Vendor',
    accepted_by_requester: 'Accepted by You',
    cancelled_by_requester: 'Cancelled by Requester',
    completed: 'Completed',
  }
  return labelByStatus[value] || value
}

function ResourceMatchingPage() {
  const { requestId } = useParams()
  const [params] = useSearchParams()
  const postId = params.get('postId')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState(null)
  const [resources, setResources] = useState([])

  useEffect(() => {
    let active = true

    // Load matching resources for this request
    getMatchingOptions({ requestId, postId })
      .then((result) => {
        if (!active) return
        setRequest(result.request)
        // Use vendors list as resource options
        setResources(result.vendors || [])
      })
      .catch((error) => {
        if (active) {
          console.error('Error loading resources:', error)
          setResources([])
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestId, postId])

  const selectResource = async (resourceId) => {
    if (!request?.id) return
    const resource = resources.find((item) => item.id === resourceId)
    if (!resource?.isSelectable) return
    // Navigate to confirmation after selection
    navigate(`/posts/${postId}`)
  }

  if (loading) return <p className="state-text">Finding available resources...</p>

  if (!request || resources.length === 0) {
    return <p className="state-text">No matching resources found for this request.</p>
  }

  return (
    <section>
      <div className="section-head">
        <h1>Resource Matches</h1>
        <p>Available resources ranked by relevance to your request.</p>
      </div>

      <div className="vendor-grid">
        {resources.map((resource) => {
          const statusLabel = formatMatchStatus(resource.matchStatus)
          const resourceName = resource.vendor_name || resource.business_name || 'Resource'
          const resourceLocation = resource.locality || 'N/A'
          const resourceCity = resource.city || 'N/A'

          return (
            <article className="vendor-card" key={resource.id}>
              <div className="vendor-title-row">
                <h3>{resourceName}</h3>
              </div>
              <p>{resourceLocation}, {resourceCity}</p>
              <ul>
                <li>Distance: {resource.distanceKm?.toFixed(1) || 'N/A'} km</li>
                <li>ETA: {resource.etaMinutes || 'N/A'} mins</li>
                <li>Match Status: {statusLabel}</li>
                <li>Availability: {resource.availability || 'Available'}</li>
              </ul>
              <button
                className="button primary full"
                onClick={() => selectResource(resource.id)}
                disabled={!resource.isSelectable}
                title={!resource.isSelectable ? `Cannot select: ${statusLabel}` : 'Select resource'}
              >
                {resource.isSelectable ? 'Select Resource' : 'Unavailable'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default ResourceMatchingPage
