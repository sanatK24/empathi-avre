import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import { currencyINR } from '../utils/format'

function urgencyClass(score) {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  return 'moderate'
}

function PostCard({ post }) {
  return (
    <article className="post-card">
      <div className="card-head">
        <span className={`urgency-chip ${urgencyClass(post.urgency)}`}>Urgency {post.urgency}</span>
        <span className="distance-chip">{Number.isFinite(post.distanceKm) ? `${post.distanceKm.toFixed(1)} km` : 'Distance n/a'}</span>
      </div>
      <h3>{post.title}</h3>
      <p className="location-text">{post.locality}, {post.city}</p>
      <p className="content-preview">{post.content}</p>
      <div className="funding-row">
        <strong>{currencyINR(post.raised)}</strong>
        <span>of {currencyINR(post.goal)}</span>
      </div>
      <ProgressBar value={post.progressPct} />
      <Link className="button primary" to={`/posts/${post.id}`}>
        Help Now
      </Link>
    </article>
  )
}

export default PostCard
