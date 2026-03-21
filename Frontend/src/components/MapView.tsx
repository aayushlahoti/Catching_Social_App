import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocation } from '../contexts/LocationContext'
import type { Coordinates } from '../contexts/LocationContext'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useEffect, useMemo } from 'react'
import { getServerUrl } from '../utils/networkHelpers'
import './MapView.css'

// Helper component to center the map when coordinates change
function RecenterAutomatically({ coords }: { coords: Coordinates }) {
  const map = useMap()
  useEffect(() => {
    map.setView([coords.lat, coords.lng], map.getZoom())
  }, [coords, map])
  return null
}


function MapView() {
  const { currentCoords, isRequesting, error: locationError } = useLocation()
  const { nearbyUsers } = useSocket()
  const { user } = useAuth()
  const navigate = useNavigate()
  const apiBaseUrl = useMemo(() => getServerUrl(), []);

  const joinUrl = (base: string, p: string) => {
    const b = base.replace(/\/+$/, '')
    const path = p.replace(/^\/+/, '')
    return `${b}/${path}`
  }

  const avatarMarker = (avatarUrl?: string | null) =>
    divIcon({
      className: 'avatar-marker',
      html: `<div class="avatar-marker__inner" style="background-image:url('${avatarUrl ? joinUrl(apiBaseUrl, avatarUrl) : ''
        }')"></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -18],
    })

  if (locationError) {
    return (
      <div className="map-placeholder error">
        <div className="error-content">
          <h3>Location Access Required</h3>
          <p>{locationError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  if (!currentCoords) {
    return (
      <div className="map-placeholder loading">
        <div className="loader-ring"></div>
        <span>{isRequesting ? 'Acquiring GPS Signal...' : 'Waiting for your location...'}</span>
      </div>
    )
  }

  const radiusMeters = 3 * 1000

  return (
    <div className="map-view-root">
      <MapContainer
        center={[currentCoords.lat, currentCoords.lng]}
        zoom={14}
        scrollWheelZoom
        className="map-view-container"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterAutomatically coords={currentCoords} />

        <Marker
          position={[currentCoords.lat, currentCoords.lng]}
          icon={avatarMarker(user?.profileImage?.path)}
        >
          <Popup>You are here</Popup>
        </Marker>

        <Circle
          center={[currentCoords.lat, currentCoords.lng]}
          radius={radiusMeters}
          pathOptions={{
            color: '#7ecbff',
            fillColor: '#7ecbff',
            fillOpacity: 0.25,
          }}
        />

        {nearbyUsers.map(u => (
          <Marker
            key={u.id}
            position={[u.coords.lat, u.coords.lng]}
            icon={avatarMarker(u.avatarUrl)}
          >
            <Popup>
              <div className="user-popup">
                <strong>{u.name}</strong>
                {u.distanceKm != null && <div>{u.distanceKm.toFixed(2)} km away</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="popup-btn view"
                    onClick={() => navigate(`/profile/${u.id}`)}
                  >
                    View
                  </button>
                  <button
                    className="popup-btn catch"
                    onClick={async () => {
                      const res = await api.authenticatedRequest('/api/requests/send', {
                        method: 'POST',
                        body: JSON.stringify({ targetUserId: u.id }),
                      })
                      if (res.success) {
                        alert(`Catch request sent to ${u.name}!`)
                      } else {
                        alert(res.message || 'Failed to send request.')
                      }
                    }}
                  >
                    Catch
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="map-status-badge">NEARBY USERS</div>
      <button className="map-requests-btn" onClick={() => navigate('/requests')}>
        Requests
      </button>

      <div
        className="map-profile-btn"
        onClick={() => navigate(`/profile/${user?.id}`)}
      >
        {user?.profileImage?.path ? (
          <img
            src={joinUrl(apiBaseUrl, user.profileImage.path)}
            alt="My Profile"
          />
        ) : (
          <div className="map-profile-placeholder">
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
    </div>
  )
}

export default MapView
