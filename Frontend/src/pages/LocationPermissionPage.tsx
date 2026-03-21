import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { useLocation } from '../contexts/LocationContext'
import './LoginSignupPage.css'

function LocationPermissionPage() {
  const navigate = useNavigate()
  const { permissionGranted, isRequesting, error, requestLocation } = useLocation()

  useEffect(() => {
    if (permissionGranted) {
      navigate('/login', { replace: true })
    }
  }, [permissionGranted, navigate])

  const handleEnableLocation = () => {
    requestLocation()
  }

  const handleSkipForNow = () => {
    navigate('/auth', { replace: true })
  }

  return (
    <div className="login-signup-page">
      <div className="geometric-background">
        <div className="bg-layer layer-1"></div>
        <div className="bg-layer layer-2"></div>
        <div className="bg-layer layer-3"></div>
      </div>
      <div className="content-container">
        <div className="buttons-container" style={{ gap: '16px' }}>
          <h1 className="page-title" style={{ color: '#ffffff' }}>
            Turn on your location to start catching nearby users
          </h1>
          {error && (
            <p style={{ color: '#ffb3b3', fontSize: '0.9rem', textAlign: 'center', maxWidth: '320px' }}>
              {error}
            </p>
          )}
          <Button
            onClick={handleEnableLocation}
            style={{
              width: '220px',
              height: '48px',
              borderRadius: '24px',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 700,
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            }}
          >
            {isRequesting ? 'Requesting location...' : 'Enable Location'}
          </Button>
          <Button
            onClick={handleSkipForNow}
            style={{
              width: '220px',
              height: '40px',
              borderRadius: '20px',
              background: 'transparent',
              color: '#ffffff',
              fontWeight: 500,
              marginTop: '8px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            Continue without location
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LocationPermissionPage

