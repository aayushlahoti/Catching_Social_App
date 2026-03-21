import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import Button from '../components/Button'
import './HomePage.css'

type UserSnap = { id: string; username: string; avatarUrl?: string | null }

function RequestsPage() {
  const navigate = useNavigate()
  const [incoming, setIncoming] = useState<UserSnap[]>([])
  const [matches, setMatches] = useState<UserSnap[]>([])
  const apiBaseUrl = (import.meta.env.VITE_SERVER_URL as string) || ''

  const joinUrl = (base: string, p: string) => {
    const b = base.replace(/\/+$/, '')
    const path = p.replace(/^\/+/, '')
    return `${b}/${path}`
  }

  const load = async () => {
    const [inRes, mRes] = await Promise.all([
      api.authenticatedRequest<{ requests: UserSnap[] }>('/api/requests/incoming'),
      api.authenticatedRequest<{ matches: UserSnap[] }>('/api/requests/matches'),
    ])
    if (inRes.success) setIncoming(inRes.data?.requests ?? [])
    if (mRes.success) setMatches(mRes.data?.matches ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accept = async (fromUserId: string) => {
    await api.authenticatedRequest('/api/requests/accept', {
      method: 'POST',
      body: JSON.stringify({ fromUserId }),
    })
    await load()
  }

  const decline = async (fromUserId: string) => {
    await api.authenticatedRequest('/api/requests/decline', {
      method: 'POST',
      body: JSON.stringify({ fromUserId }),
    })
    await load()
  }

  const avatar = (u: UserSnap) =>
    u.avatarUrl ? (
      <img
        src={joinUrl(apiBaseUrl, u.avatarUrl)}
        alt={u.username}
        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
      />
    ) : (
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff',
          fontWeight: 800,
        }}
      >
        {u.username?.slice(0, 1).toUpperCase()}
      </div>
    )

  return (
    <div className="home-page">
      <div className="home-container" style={{ textAlign: 'left', alignItems: 'stretch', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="home-title" style={{ fontSize: 22, marginBottom: 0 }}>
            Requests
          </h1>
          <Button
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}
            onClick={() => navigate('/map')}
          >
            Back
          </Button>
        </div>

        <div style={{ marginTop: 6 }}>
          <h2 style={{ color: '#fff', fontSize: 14, opacity: 0.85, margin: '10px 0' }}>Incoming</h2>
          {incoming.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>No incoming requests.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {incoming.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 10,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {avatar(u)}
                    <div style={{ color: '#fff', fontWeight: 700 }}>{u.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => accept(u.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 999,
                        border: 'none',
                        background: '#ffffff',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => decline(u.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.3)',
                        background: 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <h2 style={{ color: '#fff', fontSize: 14, opacity: 0.85, margin: '10px 0' }}>Matches</h2>
          {matches.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>No matches yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matches.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 10,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {avatar(u)}
                    <div style={{ color: '#fff', fontWeight: 700 }}>{u.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate(`/profile/${u.id}`)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.3)',
                        background: 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => navigate(`/chat/${u.id}`)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 999,
                        border: 'none',
                        background: '#ff4d6a',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RequestsPage

