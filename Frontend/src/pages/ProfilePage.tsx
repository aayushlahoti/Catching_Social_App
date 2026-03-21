import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import './ProfilePage.css'

type ProfilePayload = {
  id: string
  username: string
  profileImage?: { path?: string | null }
  age?: number
  profesion?: string
  gender?: string
  status?: string
}

function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [postUrl, setPostUrl] = useState<string | null>(null)
  const [hasLiked, setHasLiked] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<ProfilePayload>>({})
  const [uploading, setUploading] = useState(false)

  const isOwnProfile = !userId || userId === user?.id
  const apiBaseUrl = useMemo(() => (import.meta.env.VITE_SERVER_URL as string) || '', [])

  const joinUrl = (base: string, p: string) => {
    const b = base.replace(/\/+$/, '')
    const path = p.replace(/^\/+/, '')
    return `${b}/${path}`
  }

  const avatarUrl = profile?.profileImage?.path
    ? joinUrl(apiBaseUrl, String(profile.profileImage.path))
    : null

  useEffect(() => {
    const id = userId || user?.id
    if (!id) return

    const endpoint = isOwnProfile ? `/api/users/profile` : `/api/users/${id}`
    api
      .authenticatedRequest<{ user: ProfilePayload }>(endpoint)
      .then(res => {
        if (res.success && res.data?.user) {
          setProfile(res.data.user)
          setEditData({
            profesion: res.data.user.profesion,
            age: res.data.user.age,
            gender: res.data.user.gender,
            status: res.data.user.status,
          })
        }
      })
      .catch(() => { })
  }, [userId, user?.id, isOwnProfile])

  useEffect(() => {
    const id = userId || user?.id
    if (!id) return

    api
      .authenticatedRequest<{ userId: string; imageUrl: string | null }>(`/api/posts/${id}`)
      .then(res => {
        const imageUrl = res.data?.imageUrl ?? null
        if (imageUrl && apiBaseUrl) {
          setPostUrl(joinUrl(apiBaseUrl, imageUrl))
        } else {
          setPostUrl(null)
        }
      })
      .catch(() => {
        setPostUrl(null)
      })
  }, [userId, user?.id, apiBaseUrl])

  // Check if liked
  useEffect(() => {
    if (isOwnProfile || !user?.id || !userId) return
    api.authenticatedRequest<{ hasLiked: boolean }>(`/api/likes/check-status/${userId}?userId=${user.id}`)
      .then(res => {
        if (res.success) setHasLiked(!!res.data?.hasLiked)
      })
      .catch(() => { })
  }, [userId, user?.id, isOwnProfile])

  const handleLike = async () => {
    if (!profile || isOwnProfile || !user) return
    try {
      if (hasLiked) {
        // Unlike if already liked (assuming backend supports it or just toggle local for now)
        // For now, let's just stick to the requirement: "option to like"
        return
      }
      const res = await api.authenticatedRequest('/api/likes/like', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          targetUserId: profile.id,
          userName: user.username
        }),
      })
      if (res.success) setHasLiked(true)
    } catch (e) {
      console.error(e)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleDeleteProfile = async () => {
    const isConfirmed = window.confirm("Are you sure you want to delete your profile? This action cannot be undone.");
    if (!isConfirmed) return;

    try {
      const res = await api.authenticatedRequest<{success: boolean, message?: string}>('/api/users/delete-profile', {
        method: 'DELETE'
      });
      if (res.success) {
        alert("Profile deleted successfully.");
        await logout();
        navigate('/login');
      } else {
        alert(res.message || 'Failed to delete profile');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting profile');
    }
  }

  const handleSaveProfile = async () => {
    try {
      const res = await api.authenticatedRequest('/api/users/updateDetails', {
        method: 'PUT',
        body: JSON.stringify(editData)
      })
      if (res.success) {
        setProfile(prev => prev ? { ...prev, ...editData } : null)
        setIsEditing(false)
      } else {
        alert(res.message || 'Failed to update profile')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pfp' | 'post') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    const endpoint = type === 'pfp' ? '/api/users/upload-profile-picture' : '/api/posts/upload'
    const fieldName = type === 'pfp' ? 'profileImage' : 'image'

    formData.append(fieldName, file)

    try {
      const res = await api.authenticatedRequest(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (res.success) {
        if (type === 'pfp') {
          const newPfp = res.data.profileImage
          setProfile(prev => prev ? { ...prev, profileImage: newPfp } : null)
          updateUser({ profileImage: newPfp })
        } else {
          setPostUrl(joinUrl(apiBaseUrl, res.data.imageUrl))
        }
        alert(`${type === 'pfp' ? 'Profile picture' : 'Post'} uploaded successfully!`)
      } else {
        alert(res.message || 'Upload failed')
      }
    } catch (err) {
      console.error(err)
      alert('Upload failed due to network error')
    } finally {
      setUploading(false)
    }
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-left-col">
          <div className="profile-header">
            <div className="back-arrow" onClick={() => navigate(-1)}>&#8592;</div>
            {isOwnProfile && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="logout-link" onClick={handleLogout}>LOGOUT</button>
                <button className="logout-link" style={{ color: '#ff4d6a', borderColor: '#ff4d6a' }} onClick={handleDeleteProfile}>DELETE PROFILE</button>
              </div>
            )}
          </div>

          <div className="profile-avatar-wrapper">
            <div style={{ position: 'relative' }}>
              <img
                src={avatarUrl || 'https://via.placeholder.com/180'}
                alt="Profile"
                className="profile-avatar"
              />
              {isOwnProfile && isEditing && (
                <label className="pfp-upload-overlay">
                  <span>📸</span>
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'pfp')}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            {isOwnProfile && (
              <button
                className="edit-toggle-btn"
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
              >
                {isEditing ? 'SAVE CHANGES' : 'EDIT PROFILE'}
              </button>
            )}
          </div>

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-info-label">Profession</span>
              {isEditing ? (
                <input
                  className="edit-input"
                  value={editData.profesion || ''}
                  onChange={e => setEditData({ ...editData, profesion: e.target.value })}
                />
              ) : (
                <span className="profile-info-value">{profile.profesion || 'None'}</span>
              )}
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Name</span>
              <span className="profile-info-value">{profile.username}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Age</span>
              {isEditing ? (
                <input
                  className="edit-input"
                  type="number"
                  value={editData.age || ''}
                  onChange={e => setEditData({ ...editData, age: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="profile-info-value">{profile.age || '-'}</span>
              )}
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Gender</span>
              {isEditing ? (
                <select
                  className="edit-input"
                  value={editData.gender || ''}
                  onChange={e => setEditData({ ...editData, gender: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <span className="profile-info-value">{profile.gender || '-'}</span>
              )}
            </div>
          </div>

          <div className="profile-status-section">
            <div className="profile-status-label">Bio / Status</div>
            {isEditing ? (
              <textarea
                className="edit-textarea"
                placeholder="What's on your mind?"
                value={editData.status || ''}
                onChange={e => setEditData({ ...editData, status: e.target.value })}
              />
            ) : (
              <div className="profile-status-text">
                {profile.status || "No status set yet."}
              </div>
            )}
          </div>
        </div>

        <div className="profile-right-col">
          <div className="profile-image-card">
            <img
              src={postUrl || 'https://via.placeholder.com/600x800?text=No+Featured+Post'}
              alt="Featured Post"
              className="profile-main-image"
            />
            {isOwnProfile && !postUrl && (
              <label className="post-upload-btn">
                <span>UPLOAD FEATURED POST</span>
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'post')}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="profile-actions">
            {!isOwnProfile && (
              <button
                className="action-btn like"
                onClick={handleLike}
                style={{ backgroundColor: hasLiked ? '#ff4d6a' : '#ffffff', color: hasLiked ? '#ffffff' : '#ff4d6a' }}
              >
                <span style={{ fontSize: '32px' }}>{hasLiked ? '❤️' : '🤍'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

