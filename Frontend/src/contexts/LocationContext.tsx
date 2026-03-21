import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export interface Coordinates {
  lat: number
  lng: number
}

interface LocationState {
  permissionGranted: boolean
  currentCoords: Coordinates | null
  isRequesting: boolean
  error: string | null
}

interface LocationContextType extends LocationState {
  requestLocation: () => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device.')
      return
    }

    setIsRequesting(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      position => {
        setPermissionGranted(true)
        setCurrentCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsRequesting(false)
      },
      geoError => {
        setPermissionGranted(false)
        setError(geoError.message || 'Unable to fetch location.')
        setIsRequesting(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    )
  }

  // Use watchPosition for real-time updates (production level)
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    const watchId = navigator.geolocation.watchPosition(
      position => {
        setPermissionGranted(true)
        setCurrentCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setError(null)
      },
      geoError => {
        // Only set error if it's a permanent denial
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setPermissionGranted(false)
          setError(geoError.message || 'Unable to fetch location.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, []) // Run only once on mount


  const value: LocationContextType = {
    permissionGranted,
    currentCoords,
    isRequesting,
    error,
    requestLocation,
  }

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return ctx
}

