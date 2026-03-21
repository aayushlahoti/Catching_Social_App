import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getServerUrl } from '../utils/networkHelpers'

interface User {
  id: string
  username: string
  profileImage?: { path?: string | null }
}

interface AuthContextType {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  updateUser: (userData: Partial<User>) => void
  clearAuth: () => void
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Store token in memory only (not localStorage to prevent XSS)
  const setAuth = (token: string, userData: User) => {
    setAccessToken(token)
    setUser(userData)
  }

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...userData } : null))
  }

  //this will try to restore sessions when the page is loaded 
  useEffect(() => {
    refreshAccessToken();
  }, []);

  const clearAuth = () => {
    setAccessToken(null)
    setUser(null)
  }

  const logout = async () => {
    try {
      const API_BASE_URL = getServerUrl()
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      clearAuth()
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    if (isRefreshing) {
      return false
    }

    setIsRefreshing(true)
    try {
      const API_BASE_URL = getServerUrl()
      const response = await fetch(`${API_BASE_URL}/api/users/refresh-token`, {
        method: 'POST',
        credentials: 'include', // Include cookies for refresh token
      })

      if (response.ok) {
        const data = await response.json()
        const token = data?.data?.token
        const refreshedUser = data?.data?.user
        if (token) {
          setAccessToken(token)
          if (refreshedUser) {
            setUser(refreshedUser)
          }
          setIsRefreshing(false)
          return true
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }

    setIsRefreshing(false)
    clearAuth()
    return false
  }

  const value: AuthContextType = {
    accessToken,
    user,
    isAuthenticated: !!accessToken && !!user,
    setAuth,
    updateUser,
    clearAuth,
    logout,
    refreshAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
