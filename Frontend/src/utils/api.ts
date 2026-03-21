import { getServerUrl } from './networkHelpers'

const apiBaseUrl = getServerUrl()

export interface SignupData {
  username: string
  password: string
  confirmPassword: string
}

export interface LoginData {
  username: string
  password: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  accessToken?: string
  user?: {
    id: string
    username: string
  }
}

// Get access token from auth context
//initially the token getter here does not exist 
let getAccessToken: (() => string | null) | null = null
let refreshTokenFn: (() => Promise<boolean>) | null = null

//this is used in authContext and used for getting tokens and refreshing tokens
export function setAuthHelpers(
  getToken: () => string | null,
  refresh: () => Promise<boolean>
) {
  getAccessToken = getToken
  refreshTokenFn = refresh
}

// Make authenticated API request with auto-refresh on 401
async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken?.()

  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for refresh token
  })

  // Handle 401 - try to refresh token
  if (response.status === 401 && refreshTokenFn) {
    const refreshed = await refreshTokenFn()
    if (refreshed) {
      // Retry the request with new token
      const newToken = getAccessToken?.()
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`)
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        })
      }
    }
  }

  return response
}

export const api = {
  async signup(data: SignupData): Promise<ApiResponse> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      if (response.status === 201) {
        const token = responseData?.data?.token ?? null
        const user = responseData?.data?.user ?? null
        return {
          success: true,
          data: responseData?.data,
          accessToken: token,
          user,
          message: 'Signup successful',
        }
      } else if (response.status === 409) {
        return {
          success: false,
          message: 'User already exists',
        }
      } else if (response.status === 400) {
        return {
          success: false,
          message: responseData.message || 'Invalid input',
        }
      } else {
        return {
          success: false,
          message: responseData.message || 'Signup failed',
        }
      }
    } catch (error) {
      console.error('Signup Network Error details:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      }
    }
  },

  async login(data: LoginData): Promise<ApiResponse> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      if (response.status === 200) {
        const token = responseData?.data?.token ?? null
        const user = responseData?.data?.user ?? null
        return {
          success: true,
          data: responseData?.data,
          accessToken: token,
          user,
          message: 'Login successful',
        }
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid credentials',
        }
      } else if (response.status === 400) {
        return {
          success: false,
          message: responseData.message || 'Invalid input',
        }
      } else {
        return {
          success: false,
          message: responseData.message || 'Login failed',
        }
      }
    } catch (error) {
      console.error('Login Network Error details:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      }
    }
  },

  async logout(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        return {
          success: true,
          message: 'Logged out successfully',
        }
      } else {
        return {
          success: false,
          message: 'Logout failed',
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please try again.',
      }
    }
  },

  // Generic authenticated request method
  async authenticatedRequest<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = { ...options.headers } as any
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await authenticatedFetch(`${apiBaseUrl}${url}`, {
        ...options,
        headers,
      })

      const responseData = await response.json()

      if (response.ok) {
        return {
          success: !!responseData?.success,
          data: responseData?.data,
          message: responseData?.message,
        }
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Unauthorized',
        }
      } else {
        return {
          success: false,
          message: responseData.message || 'Request failed',
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please try again.',
      }
    }
  },
}
