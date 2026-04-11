import { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { updateMyProfile } from '../services/authService'

function UserProfilePage() {
  const { profile, updateProfile } = useAppContext()
  const [fullName, setFullName] = useState(profile.fullName || '')
  const [email, setEmail] = useState(profile.email || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [organizationName, setOrganizationName] = useState(profile.organizationName || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setFullName(profile.fullName || '')
    setEmail(profile.email || '')
    setPhone(profile.phone || '')
    setOrganizationName(profile.organizationName || '')
    setBio(profile.bio || '')
  }, [profile.fullName, profile.email, profile.phone, profile.organizationName, profile.bio])

  const onSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      let backendUser = null
      if (profile.accessToken) {
        backendUser = await updateMyProfile({
          name: fullName,
          email,
          accessToken: profile.accessToken,
        })
      }

      updateProfile({
        fullName: backendUser?.name || fullName,
        email: backendUser?.email || email,
        phone,
        organizationName,
        bio,
      })

      setMessage('Profile updated successfully.')
    } catch (e) {
      setError(e.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="onboarding">
      <h1>User Profile</h1>
      <p>Manage your profile and preferences.</p>

      <label className="input-label" htmlFor="profile-fullName">
        Full Name
      </label>
      <input
        id="profile-fullName"
        type="text"
        className="input-control"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Your name"
      />

      <label className="input-label" htmlFor="profile-email">
        Email Address
      </label>
      <input
        id="profile-email"
        type="email"
        className="input-control"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />

      <label className="input-label" htmlFor="profile-phone">
        Phone Number
      </label>
      <input
        id="profile-phone"
        type="tel"
        className="input-control"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+91 9876543210"
      />

      <label className="input-label" htmlFor="profile-org">
        Organization Name
      </label>
      <input
        id="profile-org"
        type="text"
        className="input-control"
        value={organizationName}
        onChange={(e) => setOrganizationName(e.target.value)}
        placeholder="Organization"
      />

      <label className="input-label" htmlFor="profile-bio">
        Bio
      </label>
      <textarea
        id="profile-bio"
        className="input-control"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Tell us about yourself"
        rows="4"
      />

      {message ? <small>{message}</small> : null}
      {error ? <small className="error-text">{error}</small> : null}

      <div className="button-group">
        <button className="button primary" onClick={onSave} disabled={saving || !fullName || !email}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </section>
  )
}

export default UserProfilePage
