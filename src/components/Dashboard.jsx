import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'

function Dashboard() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadMeetings()
  }, [])

  const loadMeetings = async () => {
    try {
      const data = await api.getMeetings()
      setMeetings(data)
    } catch (err) {
      console.error('Failed to load meetings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (meetingId, meetingTitle, e) => {
    e.stopPropagation() // Prevent card click
    
    if (!window.confirm(`Are you sure you want to delete "${meetingTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.deleteMeeting(meetingId)
      // Reload meetings after deletion
      loadMeetings()
    } catch (err) {
      console.error('Failed to delete meeting:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to delete meeting'
      alert(`Failed to delete meeting: ${errorMessage}`)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Your Meetings</h2>
        {user?.role === 'Admin' && (
          <Link to="/upload" className="btn btn-primary">
            + New Transcript
          </Link>
        )}
      </div>

      {meetings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>No meetings yet</h3>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            {user?.role === 'Admin' 
              ? 'Upload your first meeting transcript to get started'
              : 'No meetings have been uploaded yet. Contact an administrator to upload transcripts.'}
          </p>
          {user?.role === 'Admin' && (
            <Link to="/upload" className="btn btn-primary">
              Upload Transcript
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="card"
              style={{ position: 'relative' }}
            >
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/meeting/${meeting.id}`)}
              >
                <h3 style={{ marginBottom: '0.5rem' }}>{meeting.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {new Date(meeting.processed_at).toLocaleDateString()}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                  <span>🎯 {meeting.summary?.total_actions || 0} Actions</span>
                  <span>💡 {meeting.summary?.total_decisions || 0} Decisions</span>
                  <span>🚧 {meeting.summary?.total_blockers || 0} Blockers</span>
                </div>
              </div>
              {(user?.role === 'Admin' || meeting.owner_id === user?.id) && (
                <button
                  onClick={(e) => handleDelete(meeting.id, meeting.title, e)}
                  className="btn btn-secondary"
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none'
                  }}
                  title="Delete meeting"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard

