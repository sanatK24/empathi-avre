import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { createDonation } from '../services/dataService'

function DonationPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAppContext()
  const [amount, setAmount] = useState(500)
  const [method, setMethod] = useState('UPI')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)

    await createDonation({
      postId,
      userId: profile.userId,
      amount,
      method,
    })

    navigate(`/posts/${postId}`)
  }

  return (
    <section className="donation-box">
      <h1>Donation Flow</h1>
      <p>Every contribution instantly updates post funding in this frontend state.</p>

      <form onSubmit={submit} className="form-stack">
        <label className="input-label" htmlFor="amount">Amount</label>
        <input
          id="amount"
          className="input-control"
          type="number"
          min="50"
          step="50"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />

        <label className="input-label" htmlFor="method">Payment Method</label>
        <select
          id="method"
          className="input-control"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
          <option value="NetBanking">NetBanking</option>
          <option value="Wallet">Wallet</option>
        </select>

        <button className="button primary full" type="submit" disabled={saving}>
          {saving ? 'Processing...' : 'Confirm Donation'}
        </button>
      </form>
    </section>
  )
}

export default DonationPage
