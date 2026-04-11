import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { useAppContext } from '../context/AppContext'
import { getPostDetails } from '../services/dataService'
import { currencyINR } from '../utils/format'

function urgencyLabel(score) {
  if (score >= 85) return 'Critical'
  if (score >= 65) return 'High'
  return 'Moderate'
}

function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAppContext()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getPostDetails(id, profile.location)
      .then((response) => {
        if (active) setDetails(response)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, profile.location])

  if (loading) {
    return <p className="state-text">Loading post details...</p>
  }

  if (!details?.post) {
    return <p className="state-text">Post not found.</p>
  }

  const { post, donations, request } = details

  return (
    <section className="detail-layout">
      <article className="detail-main">
        <span className="urgency-chip critical">{urgencyLabel(post.urgency)} urgency</span>
        <h1>{post.title}</h1>
        <p>{post.content}</p>

        <div className="meta-row">
          <span>{post.locality}, {post.city}</span>
          <span>{Number.isFinite(post.distanceKm) ? `${post.distanceKm.toFixed(1)} km away` : 'Distance n/a'}</span>
        </div>

        <div className="funding-row">
          <strong>{currencyINR(post.raised)}</strong>
          <span>of {currencyINR(post.goal)}</span>
        </div>
        <ProgressBar value={post.progressPct} />

        <div className="action-row">
          <button className="button primary" onClick={() => navigate(`/donate/${post.id}`)}>Donate</button>
          <button
            className="button secondary"
            onClick={() => navigate(`/matching/${request?.id || ''}?postId=${post.id}`)}
          >
            Request Help
          </button>
        </div>
      </article>

      <aside className="detail-side">
        <h3>Map</h3>
        <a
          className="map-link"
          href={`https://www.google.com/maps?q=${post.lat},${post.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          Open location in map
        </a>

        <h3>Recent Donations</h3>
        <ul className="mini-list">
          {donations.slice(0, 6).map((donation) => (
            <li key={donation.id}>
              <span>User {donation.user_id}</span>
              <strong>{currencyINR(donation.amount)}</strong>
            </li>
          ))}
        </ul>

        <Link to="/feed" className="button ghost full">Back to Feed</Link>
      </aside>
    </section>
  )
}

export default PostDetailPage
