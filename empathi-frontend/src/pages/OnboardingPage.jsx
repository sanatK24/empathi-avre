import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { USER_ROLES, ROLE_DESCRIPTIONS, CITY_OPTIONS } from '../utils/constants'
import { authenticateWithGoogleAndSyncRole } from '../services/authService'

function OnboardingPage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAppContext()
  const [city, setCity] = useState(profile.city || CITY_OPTIONS[0])
  const [userRole, setUserRole] = useState(profile.userRole || '')
  const [email, setEmail] = useState(profile.email || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [fullName, setFullName] = useState(profile.fullName || '')
  const [organizationName, setOrganizationName] = useState(
    profile.organizationName || '',
  )
  const [bio, setBio] = useState(profile.bio || '')
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [coords, setCoords] = useState(profile.location)
  const [step, setStep] = useState(1)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const locationText = useMemo(() => {
    if (!coords) return 'Location not enabled'
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
  }, [coords])

  const enableLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.')
      return
    }

    setLoadingGeo(true)
    setGeoError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setCoords(location)
        setLoadingGeo(false)
      },
      () => {
        setGeoError('Could not fetch your location. You can continue without it.')
        setLoadingGeo(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const continueFlow = async () => {
    setAuthLoading(true)
    setAuthError('')

    try {
      const session = await authenticateWithGoogleAndSyncRole(userRole)
      const backendUser = session.user || {}

      updateProfile({
        city,
        location: coords,
        userRole,
        email: backendUser.email || email,
        phone,
        fullName: backendUser.name || fullName,
        organizationName,
        bio,
        accessToken: session.accessToken,
        backendUserId: backendUser.id,
        backendRole: backendUser.role,
        isAuthenticated: true,
      })

      navigate('/feed')
    } catch (error) {
      setAuthError(error.message || 'Sign-in failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <section className="onboarding">
      {step === 1 && (
        <>
          <h1>Welcome to EmpathI</h1>
          <p>Set your city and location to rank urgent posts nearby first.</p>

          <label className="input-label" htmlFor="city">
            City
          </label>
          <select
            id="city"
            className="input-control"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {CITY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className="location-box">
            <div>
              <h3>Device location</h3>
              <p>{locationText}</p>
              {geoError ? <small className="error-text">{geoError}</small> : null}
            </div>
            <button
              className="button ghost"
              onClick={enableLocation}
              disabled={loadingGeo}
            >
              {loadingGeo ? 'Locating...' : 'Enable Location'}
            </button>
          </div>

          <button
            className="button primary full"
            onClick={() => setStep(2)}
          >
            Next: Choose Your Role
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1>Your Role</h1>
          <p>Choose how you'd like to participate:</p>

          <fieldset className="role-options">
            {Object.entries(USER_ROLES).map(([key, value]) => (
              <label key={value} className="role-option">
                <input
                  type="radio"
                  name="userRole"
                  value={value}
                  checked={userRole === value}
                  onChange={(e) => setUserRole(e.target.value)}
                />
                <strong className="role-name">{key}</strong>
                <span className="role-description">{ROLE_DESCRIPTIONS[value]}</span>
              </label>
            ))}
          </fieldset>

          <div className="button-group">
            <button className="button secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="button primary"
              onClick={() => setStep(3)}
              disabled={!userRole}
            >
              Next: Contact Info
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1>Contact Information</h1>
          <p>Help us reach you when needed:</p>

          <label className="input-label" htmlFor="fullName">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            className="input-control"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />

          <label className="input-label" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="input-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />

          <label className="input-label" htmlFor="phone">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            className="input-control"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
          />

          {(userRole === USER_ROLES.NGO || userRole === USER_ROLES.VENDOR) && (
            <>
              <label className="input-label" htmlFor="organizationName">
                Organization Name
              </label>
              <input
                id="organizationName"
                type="text"
                className="input-control"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Your organization"
              />
            </>
          )}

          <label className="input-label" htmlFor="bio">
            About You / Organization (Optional)
          </label>
          <textarea
            id="bio"
            className="input-control"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows="3"
          />

          <div className="button-group">
            <button className="button secondary" onClick={() => setStep(2)}>
              Back
            </button>
            {authError ? <small className="error-text">{authError}</small> : null}
            <button
              className="button primary"
              onClick={continueFlow}
              disabled={!fullName || !email || !phone || authLoading}
            >
              {authLoading ? 'Signing in with Google...' : 'Complete Setup'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default OnboardingPage
