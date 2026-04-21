import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getMatchingOptions, selectVendor } from '../services/dataService'

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

function badgeFor(vendor, all) {
  const sortedByDistance = [...all].sort((a, b) => a.distanceKm - b.distanceKm)
  const sortedByEta = [...all].sort((a, b) => a.etaMinutes - b.etaMinutes)
  const sortedByRating = [...all].sort((a, b) => Number(b.rating) - Number(a.rating))

  if (sortedByEta[0]?.id === vendor.id) return 'Fastest'
  if (sortedByRating[0]?.id === vendor.id) return 'Top Rated'
  if (sortedByDistance[0]?.id === vendor.id) return 'Closest'
  return ''
}

function MatchingPage() {
  const { requestId } = useParams()
  const [params] = useSearchParams()
  const postId = params.get('postId')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState(null)
  const [vendors, setVendors] = useState([])

  useEffect(() => {
    let active = true

    getMatchingOptions({ requestId, postId })
      .then((result) => {
        if (!active) return
        setRequest(result.request)
        setVendors(result.vendors)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestId, postId])

  const bestVendor = useMemo(() => vendors[0], [vendors])

  const chooseVendor = async (vendorId) => {
    if (!request?.id) return
    const vendor = vendors.find((item) => item.id === vendorId)
    if (!vendor?.isSelectable) return
    await selectVendor(request.id, vendorId)
    navigate(`/posts/${postId}`)
  }

  if (loading) return <p className="state-text">Running matching engine...</p>

  if (!request || vendors.length === 0) {
    return <p className="state-text">No matching vendors found for this request.</p>
  }

  return (
    <section>
      <div className="section-head">
        <h1>Vendor Matching</h1>
        <p>Vendors are pre-ranked by score from your matching engine.</p>
      </div>

      <div className="vendor-grid">
        {vendors.map((vendor) => {
          const badge = badgeFor(vendor, vendors)
          const isBest = bestVendor?.id === vendor.id
          const statusLabel = formatMatchStatus(vendor.matchStatus)
          const vendorTitle = vendor.vendor_name || vendor.business_name || 'Vendor'
          const vendorLocality = vendor.locality || 'N/A'
          const vendorCity = vendor.city || 'N/A'

          return (
            <article className={`vendor-card ${isBest ? 'best' : ''}`} key={vendor.id}>
              <div className="vendor-title-row">
                <h3>{vendorTitle}</h3>
                {badge ? <span className="vendor-badge">{badge}</span> : null}
              </div>
              <p>{vendorLocality}, {vendorCity}</p>
              <ul>
                <li>Distance: {vendor.distanceKm.toFixed(1)} km</li>
                <li>ETA: {vendor.etaMinutes} mins</li>
                <li>Rating: {Number(vendor.rating).toFixed(1)}</li>
                <li>Match Status: {statusLabel}</li>
                <li>Availability: {vendor.availability}</li>
              </ul>
              <button
                className="button primary full"
                onClick={() => chooseVendor(vendor.id)}
                disabled={!vendor.isSelectable}
                title={!vendor.isSelectable ? `Cannot select: ${statusLabel}` : 'Select vendor'}
              >
                {vendor.isSelectable ? 'Select Vendor' : 'Unavailable'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default MatchingPage
