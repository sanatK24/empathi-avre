import { useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { USER_ROLES, ROLE_DESCRIPTIONS, CITY_OPTIONS } from '../utils/constants'
import { authenticateWithGoogleAndSyncRole } from '../services/authService'

const contactFields = [
  { id: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Your name' },
  { id: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
  { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+91 9876543210' },
  { id: 'bio', label: 'About You (Optional)', type: 'textarea', placeholder: 'Tell us about yourself...' }
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAppContext()
  const [step, setStep] = useState(1)
  const [geo, setGeo] = useState({ loading: false, error: '', coords: profile.location })
  const [auth, setAuth] = useState({ loading: false, error: '' })
  const [form, setForm] = useState({
    city: profile.city || CITY_OPTIONS[0], userRole: profile.userRole || '', email: profile.email || '',
    phone: profile.phone || '', fullName: profile.fullName || '', bio: profile.bio || ''
  })

  const { city, userRole, email, phone, fullName, bio } = form
  const change = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const enableLocation = () => {
    if (!navigator.geolocation) return setGeo(g => ({ ...g, error: 'Geolocation is not supported in this browser.' }))
    setGeo(g => ({ ...g, loading: true, error: '' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ loading: false, error: '', coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => setGeo(g => ({ ...g, loading: false, error: 'Could not fetch your location. You can continue without it.' })),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const continueFlow = async () => {
    setAuth({ loading: true, error: '' })
    try {
      const session = await authenticateWithGoogleAndSyncRole(userRole)
      const u = session.user || {}
      updateProfile({
        city, location: geo.coords, userRole, email: u.email || email, phone, fullName: u.name || fullName,
        bio, accessToken: session.accessToken, backendUserId: u.id, backendRole: u.role, isAuthenticated: true
      })
      navigate('/feed')
    } catch (err) {
      setAuth({ loading: false, error: err.message || 'Sign-in failed. Please try again.' })
    }
  }

  return (
    <section className="onboarding">
      {step === 1 && (
        <>
          <h1>Welcome to EmpathI</h1>
          <p>Set your city and location to rank urgent posts nearby first.</p>
          <label className="input-label" htmlFor="city">City</label>
          <select id="city" className="input-control" value={city} onChange={change('city')}>
            {CITY_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="location-box">
            <div>
              <h3>Device location</h3>
              <p>{geo.coords ? `${geo.coords.lat.toFixed(4)}, ${geo.coords.lng.toFixed(4)}` : 'Location not enabled'}</p>
              {geo.error && <small className="error-text">{geo.error}</small>}
            </div>
            <button className="button ghost" onClick={enableLocation} disabled={geo.loading}>
              {geo.loading ? 'Locating...' : 'Enable Location'}
            </button>
          </div>
          <button className="button primary full" onClick={() => setStep(2)}>Next: Choose Your Role</button>
        </>
      )}

      {step === 2 && (
        <>
          <h1>Your Role</h1>
          <p>Choose how you'd like to participate:</p>
          <fieldset className="role-options">
            {Object.entries(USER_ROLES).map(([key, value]) => (
              <label key={value} className="role-option">
                <input type="radio" name="userRole" value={value} checked={userRole === value} onChange={change('userRole')} />
                <strong className="role-name">{key}</strong>
                <span className="role-description">{ROLE_DESCRIPTIONS[value]}</span>
              </label>
            ))}
          </fieldset>
          <div className="button-group">
            <button className="button secondary" onClick={() => setStep(1)}>Back</button>
            <button className="button primary" onClick={() => setStep(3)} disabled={!userRole}>Next: Contact Info</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1>Contact Information</h1>
          <p>Help us reach you when needed:</p>
          {contactFields.map(f => {
            if (f.cond && !f.cond(userRole)) return null
            const Tag = f.type === 'textarea' ? 'textarea' : 'input'
            return (
              <Fragment key={f.id}>
                <label className="input-label" htmlFor={f.id}>{f.label}</label>
                <Tag
                  id={f.id}
                  type={f.type !== 'textarea' ? f.type : undefined}
                  className="input-control"
                  value={form[f.id]}
                  onChange={change(f.id)}
                  placeholder={f.placeholder}
                  rows={f.type === 'textarea' ? '3' : undefined}
                />
              </Fragment>
            )
          })}
          <div className="button-group">
            <button className="button secondary" onClick={() => setStep(2)}>Back</button>
            {auth.error && <small className="error-text">{auth.error}</small>}
            <button className="button primary" onClick={continueFlow} disabled={!fullName || !email || !phone || auth.loading}>
              {auth.loading ? 'Signing in with Google...' : 'Complete Setup'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
