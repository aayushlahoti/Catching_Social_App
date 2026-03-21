import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import Button from '../components/Button'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuth()

  const handleLogout = async () => {
    try {
      await api.logout()
      clearAuth()
      navigate('/auth')
    } catch (error) {
      // Even if logout fails, clear local auth state
      clearAuth()
      navigate('/auth')
    }
  }

  return (
    <div className="home-page">
      <div className="home-container">
        <h1 className="home-title">Welcome, {user?.username}!</h1>
        <p className="home-subtitle">You are successfully authenticated.</p>
        <Button
          onClick={handleLogout}
          style={{
            width: '200px',
            padding: '12px',
            background: '#000000',
            color: '#FFFFFF',
            borderRadius: '20px',
            marginTop: '30px',
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  )
}

export default HomePage
