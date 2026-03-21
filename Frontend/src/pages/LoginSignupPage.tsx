import { useNavigate } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/Button'
import './LoginSignupPage.css'

function LoginSignupPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/map" replace />
  }

  return (
    <div className="login-signup-page">
      <div className="geometric-background">
        <div className="bg-layer layer-1"></div>
        <div className="bg-layer layer-2"></div>
        <div className="bg-layer layer-3"></div>
      </div>
      <div className="content-container">
        <div className="buttons-container">
          <Button
            onClick={() => navigate('/login')}
            style={{
              width: '180px',
              height: '44px',
              borderRadius: '22px',
              background: '#D9D9D9',
              color: '#000000',
              fontWeight: 600,
            }}
          >
            LOG IN
          </Button>
          <Button
            onClick={() => navigate('/signup')}
            style={{
              width: '180px',
              height: '44px',
              borderRadius: '22px',
              background: '#D9D9D9',
              color: '#000000',
              fontWeight: 600,
              marginTop: '16px',
            }}
          >
            SIGN UP
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LoginSignupPage
