import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { useLocation, type Coordinates } from './LocationContext'
import { getSocketUrl } from '../utils/networkHelpers'

export interface NearbyUser {
  id: string
  name: string
  avatarUrl?: string
  coords: Coordinates
  distanceKm?: number
}

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  message: string
  timestamp: string
  status?: string
}

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  nearbyUsers: NearbyUser[]
  notifications: any[]
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth()
  const { currentCoords } = useLocation()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  // In production getSocketUrl() returns '', so fall back to current origin
  // (Socket.IO will connect to the same host serving the frontend)
  const socketUrl = useMemo(() => {
    // getSocketUrl() returns '' on production domains (e.g. onrender.com),
    // so fall back to window.location.origin which always points to the correct host.
    return getSocketUrl(8000) || window.location.origin
  }, [])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
    })

    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnected(true)
      newSocket.emit('join-map')
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('nearby-users', (users: NearbyUser[]) => {
      setNearbyUsers(users)
    })

    newSocket.on('user-offline', ({ userId }: { userId: string }) => {
      setNearbyUsers(prev => prev.filter(u => u.id !== userId))
    })

    newSocket.on('request_received', (payload: any) => {
      setNotifications(prev => [...prev, { type: 'request_received', ...payload }])
    })

    newSocket.on('request_accepted', (payload: any) => {
      setNotifications(prev => [...prev, { type: 'request_accepted', ...payload }])
    })

    newSocket.on('chat_deleted', (payload: any) => {
      setNotifications(prev => [...prev, { type: 'chat_deleted', ...payload }])
    })

    newSocket.on('notification', (notification: any) => {
      setNotifications(prev => [...prev, notification])
    })

    return () => {
      newSocket.disconnect()
      setSocket(null)
      setConnected(false)
      setNearbyUsers([])
      setNotifications([])
    }
  }, [accessToken, socketUrl])

  // Send location updates while connected
  useEffect(() => {
    if (!socket || !connected || !currentCoords) return

    const sendNow = () => {
      socket.emit('send-location', {
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        radiusKm: 10,
      })
    }

    sendNow()
    const interval = window.setInterval(sendNow, 8000)

    return () => {
      window.clearInterval(interval)
    }
  }, [socket, connected, currentCoords])

  const value: SocketContextType = {
    socket,
    connected,
    nearbyUsers,
    notifications,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return ctx
}

