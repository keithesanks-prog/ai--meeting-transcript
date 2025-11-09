import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { api } from '../utils/api'
import ActionTriage from './ActionTriage'
import OwnerWheel from './OwnerWheel'
import KanbanBoard from './KanbanBoard'

function MeetingView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState('')
  const [emailType, setEmailType] = useState('summary')
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    loadMeeting()
  }, [id])

  const loadMeeting = async () => {
    try {
      const data = await api.getMeeting(id)
      setMeeting(data)
    } catch (err) {
      console.error('Failed to load meeting:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to load meeting'
      // Could show error to user here if needed
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    try {
      const data = await api.exportMeeting(id, format)
      
      if (format === 'owner' && selectedOwner) {
        // Format for owner notification
        const text = `Hi ${selectedOwner},\n\nFrom the meeting "${meeting.title}", you have ${data.count} task(s):\n\n${data.actions.map((a, i) => `${i + 1}. ${a.description}`).join('\n')}\n\nBest regards`
        navigator.clipboard.writeText(text)
        alert('Owner notification copied to clipboard!')
      } else if (format === 'decisions') {
        // Format for executive summary
        const text = `Meeting: ${meeting.title}\n\nKey Decisions:\n\n${data.decisions.map((d, i) => `${i + 1}. ${d.description}`).join('\n')}`
        navigator.clipboard.writeText(text)
        alert('Executive summary copied to clipboard!')
      }
    } catch (err) {
      console.error('Export failed:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Export failed'
      alert(`Export failed: ${errorMessage}`)
    }
  }

  const handleShare = async () => {
    try {
      const result = await api.createShareLink(id)
      const shareUrl = `${window.location.origin}/meeting/${id}?share=${result.token}`
      navigator.clipboard.writeText(shareUrl)
      alert('Shareable link copied to clipboard!')
    } catch (err) {
      console.error('Share failed:', err)
    }
  }

  const handleDelete = async () => {
    if (!meeting) return
    
    if (!window.confirm(`Are you sure you want to delete "${meeting.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.deleteMeeting(id)
      navigate('/')
    } catch (err) {
      console.error('Failed to delete meeting:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to delete meeting'
      alert(`Failed to delete meeting: ${errorMessage}`)
    }
  }

  const handleSendEmail = async () => {
    if (!emailRecipients.trim()) {
      alert('Please enter at least one email address')
      return
    }

    // Parse email addresses (comma or newline separated)
    const emails = emailRecipients
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (emails.length === 0) {
      alert('Please enter at least one valid email address')
      return
    }

    setSendingEmail(true)
    try {
      const result = await api.sendMeetingEmail(id, emails, emailType)
      alert(`Email sent successfully to ${result.recipients.length} recipient(s)!`)
      setShowEmailModal(false)
      setEmailRecipients('')
    } catch (err) {
      console.error('Send email error:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to send email'
      alert(`Failed to send email: ${errorMessage}`)
    } finally {
      setSendingEmail(false)
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

  if (!meeting) {
    return (
      <div className="container">
        <div className="card">
          <h2>Meeting not found</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const canDelete = user && (user.role === 'Admin' || meeting.owner_id === user.id)

  const filteredActions = meeting.actions?.filter((action) => {
    if (selectedOwner && action.owner !== selectedOwner) return false
    if (activeFilter === 'all') return true
    return action.intent === activeFilter
  }) || []

  const highConfidenceActions = filteredActions.filter(a => a.confidence === 'HIGH')
  const draftActions = filteredActions.filter(a => a.confidence !== 'HIGH')

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>{meeting.title}</h2>
          <p style={{ color: '#64748b' }}>
            Processed {new Date(meeting.processed_at).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={handleShare}>
            📤 Share
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('decisions')}>
            📋 Export Decisions
          </button>
          <button className="btn btn-secondary" onClick={() => setShowEmailModal(true)}>
            📧 Email Results
          </button>
          {canDelete && (
            <button 
              className="btn btn-secondary" 
              onClick={handleDelete}
              style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }}
            >
              🗑️ Delete
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← Back
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{meeting.summary?.total_actions || 0}</div>
          <div className="stat-label">Total Actions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{meeting.summary?.total_decisions || 0}</div>
          <div className="stat-label">Decisions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{meeting.summary?.total_blockers || 0}</div>
          <div className="stat-label">Blockers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{meeting.summary?.unassigned_actions || 0}</div>
          <div className="stat-label">Unassigned</div>
        </div>
      </div>

      {/* Owner Wheel */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>⚖️ Owner Workload Distribution</h3>
        <OwnerWheel
          actions={meeting.actions || []}
          onOwnerClick={setSelectedOwner}
          selectedOwner={selectedOwner}
          filterOnly={true}
        />
        {selectedOwner && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px' }}>
            <strong>Filtered by: {selectedOwner}</strong>
            <button
              onClick={() => setSelectedOwner(null)}
              style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              className="btn btn-secondary"
            >
              Clear Filter
            </button>
            <button
              onClick={() => handleExport('owner')}
              style={{ marginLeft: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              className="btn btn-primary"
            >
              Copy Owner Summary
            </button>
            {user?.role === 'Admin' && (
              <button
                onClick={async () => {
                  try {
                    const userData = await api.getUserByName(selectedOwner)
                    if (userData) {
                      navigate(`/profile/${userData.id}`)
                    }
                  } catch (err) {
                    console.error('Failed to get user:', err)
                  }
                }}
                style={{ 
                  marginLeft: '0.5rem', 
                  padding: '0.25rem 0.75rem', 
                  fontSize: '0.85rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                👤 View Profile
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Triage Center */}
          <ActionTriage 
            actions={filteredActions} 
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            draftActions={draftActions}
            meetingId={id}
            onUpdate={loadMeeting}
            meetingOwnerId={meeting?.owner_id}
          />

      {/* Kanban Board */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>📋 Kanban Board</h3>
        <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>
          High-confidence actions are automatically added to "To Do". Drag and drop to manage workflow.
        </p>
          <KanbanBoard 
            actions={highConfidenceActions} 
            meetingId={id}
            onUpdate={loadMeeting}
            currentUser={user}
            meetingOwnerId={meeting?.owner_id}
          />
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEmailModal(false)
              setEmailRecipients('')
            }
          }}
        >
          <div 
            className="card" 
            style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '1rem' }}>📧 Email Meeting Results</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="email-type" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Email Type
              </label>
              <select
                id="email-type"
                value={emailType}
                onChange={(e) => setEmailType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="summary">Summary Only</option>
                <option value="decisions">Decisions Only</option>
                <option value="actions">Actions Only</option>
                <option value="full">Full Report</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="email-recipients" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Recipient Email Addresses
              </label>
              <textarea
                id="email-recipients"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="Enter email addresses separated by commas or new lines&#10;e.g., john@example.com, jane@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  minHeight: '100px',
                  fontFamily: 'inherit'
                }}
              />
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                Separate multiple emails with commas or new lines
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailRecipients('')
                }}
                className="btn btn-secondary"
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="btn btn-primary"
                disabled={sendingEmail || !emailRecipients.trim()}
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MeetingView

