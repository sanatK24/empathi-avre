import { useParams } from 'react-router-dom'

function VerificationDetailPage() {
  const { postId } = useParams()
  return (
    <section>
      <h1>Verify Request</h1>
      <p>Verify emergency request {postId}</p>
    </section>
  )
}

export default VerificationDetailPage
