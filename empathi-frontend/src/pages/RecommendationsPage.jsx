import { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { getRecommendationFeed } from '../services/dataService'

function RecommendationsPage() {
  const { profile } = useAppContext()
  const [loading, setLoading] = useState(true)
  const [vendors, setVendors] = useState([])
  const [posts, setPosts] = useState([])

  useEffect(() => {
    let active = true

    getRecommendationFeed({
      userId: profile.userId,
      city: profile.city,
      location: profile.location,
    })
      .then((result) => {
        if (!active) return
        setVendors(result.vendors)
        setPosts(result.posts)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [profile.city, profile.location, profile.userId])

  if (loading) return <p className="state-text">Loading recommendations...</p>

  return (
    <section>
      <div className="section-head">
        <h1>Recommendations</h1>
        <p>Trending, nearby, and behavior-based suggestions from your recommendation table.</p>
      </div>

      <h2>Vendor Suggestions</h2>
      <div className="vendor-grid">
        {vendors.map((vendor) => (
          <article className="vendor-card" key={vendor.id}>
            <div className="vendor-title-row">
              <h3>{vendor.business_name}</h3>
              <span className="vendor-badge">{vendor.label}</span>
            </div>
            <p>{vendor.locality}, {vendor.city}</p>
            <ul>
              <li>Type: {vendor.vendor_type}</li>
              <li>Rating: {Number(vendor.rating).toFixed(1)}</li>
              <li>Distance: {Number.isFinite(vendor.distanceKm) ? `${vendor.distanceKm.toFixed(1)} km` : 'n/a'}</li>
            </ul>
          </article>
        ))}
      </div>

      <h2>Recommended Posts</h2>
      <div className="mini-post-list">
        {posts.map((post) => (
          <article key={post.id} className="mini-post">
            <h3>{post.title}</h3>
            <p>{post.locality}, {post.city}</p>
            <small>Urgency {post.urgency}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

export default RecommendationsPage
