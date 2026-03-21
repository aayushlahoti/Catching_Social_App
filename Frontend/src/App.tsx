import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LocationProvider } from './contexts/LocationContext'
import { SocketProvider } from './contexts/SocketContext'
import { setAuthHelpers } from './utils/api'
import './App.css'
import LoginSignupPage from './pages/LoginSignupPage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LocationPermissionPage from './pages/LocationPermissionPage'
import AuthGuard from './components/AuthGuard'
import MapPage from './pages/MapPage'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'
import RequestsPage from './pages/RequestsPage'

function AppRoutes() {
  const { accessToken, refreshAccessToken } = useAuth()

  // Set up API helpers for token management
  useEffect(() => {
    setAuthHelpers(
      () => accessToken,
      refreshAccessToken
    )
  }, [accessToken, refreshAccessToken])

  return (
    <Routes>
      <Route path="/" element={<LocationPermissionPage />} />
      <Route path="/auth" element={<LoginSignupPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/home"
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
      <Route
        path="/map"
        element={
          <AuthGuard>
            <MapPage />
          </AuthGuard>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <AuthGuard>
            <ProfilePage />
          </AuthGuard>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <AuthGuard>
            <ChatPage />
          </AuthGuard>
        }
      />
      <Route
        path="/requests"
        element={
          <AuthGuard>
            <RequestsPage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <LocationProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </LocationProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
