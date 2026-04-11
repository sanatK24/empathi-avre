import { useEffect, useState } from 'react'
import PostCard from '../components/PostCard'
import { useAppContext } from '../context/AppContext'
import { getHomeFeed } from '../services/dataService'

function FeedPage() {
  const { profile } = useAppContext()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    getHomeFeed({ city: profile.city, location: profile.location })
      .then((rows) => {
        if (!active) return
        setPosts(rows)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [profile.city, profile.location])

  if (loading) {
    return <p className="state-text">Loading feed...</p>
  }

  return (
    <section>
      <div className="section-head">
        <h1>Home Feed</h1>
        <p>Sorted by urgency and proximity, with your city prioritized.</p>
      </div>

      <div className="post-grid">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}

export default FeedPage
