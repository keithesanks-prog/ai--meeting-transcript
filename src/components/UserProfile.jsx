import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'

function UserProfile() {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [profileUser, setProfileUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, ACTION, DECISION, BLOCKER

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const targetUserId = userId || currentUser?.id
      
      if (!targetUserId) {
        navigate('/login')
        return
      }

      const data = await api.getUserTasks(targetUserId)
      setProfileUser(data.user)
      setTasks(data.tasks || [])
    } catch (err) {
      console.error('Failed to load profile:', err)
      if (err.response?.status === 403) {
        navigate('/')
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    return task.intent === filter
  })

  const taskStats = {
    total: tasks.length,
    actions: tasks.filter(t => t.intent === 'ACTION').length,
    decisions: tasks.filter(t => t.intent === 'DECISION').length,
    blockers: tasks.filter(t => t.intent === 'BLOCKER').length,
    todo: tasks.filter(t => !t.status || t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    complete: tasks.filter(t => t.status === 'complete').length
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

  if (!profileUser) {
    return (
      <div className="container">
        <div className="card">
          <h2>User not found</h2>
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profileUser.id

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>👤 {profileUser.name}'s Profile</h2>
          <p style={{ color: '#64748b' }}>
            {profileUser.email} • {profileUser.role}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isOwnProfile && (
            <Link to="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
          )}
          {!isOwnProfile && (
            <button onClick={() => navigate('/')} className="btn btn-secondary">
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{taskStats.total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{taskStats.actions}</div>
          <div className="stat-label">Actions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{taskStats.decisions}</div>
          <div className="stat-label">Decisions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{taskStats.blockers}</div>
          <div className="stat-label">Blockers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{taskStats.todo}</div>
          <div className="stat-label">To Do</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{taskStats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{taskStats.complete}</div>
          <div className="stat-label">Complete</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Tasks ({taskStats.total})
        </button>
        <button
          className={`filter-btn ${filter === 'ACTION' ? 'active' : ''}`}
          onClick={() => setFilter('ACTION')}
        >
          🎯 Actions ({taskStats.actions})
        </button>
        <button
          className={`filter-btn ${filter === 'DECISION' ? 'active' : ''}`}
          onClick={() => setFilter('DECISION')}
        >
          💡 Decisions ({taskStats.decisions})
        </button>
        <button
          className={`filter-btn ${filter === 'BLOCKER' ? 'active' : ''}`}
          onClick={() => setFilter('BLOCKER')}
        >
          🚧 Blockers ({taskStats.blockers})
        </button>
      </div>

      {/* Tasks List */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Assigned Tasks</h3>
        
        {filteredTasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
            No tasks found for this filter.
          </p>
        ) : (
          filteredTasks.map((task, index) => (
            <div
              key={`${task.meeting_id}-${task.id}-${index}`}
              className={`action-item ${task.confidence?.toLowerCase() || 'high'}-confidence`}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/meeting/${task.meeting_id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span className={`intent-badge intent-${task.intent.toLowerCase()}`}>
                      {task.intent}
                    </span>
                    <span className={`confidence-badge confidence-${task.confidence?.toLowerCase() || 'high'}`}>
                      {task.confidence || 'HIGH'}
                    </span>
                    {task.status && (
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        background: task.status === 'complete' ? '#d1fae5' : task.status === 'in_progress' ? '#fef3c7' : '#e2e8f0',
                        color: task.status === 'complete' ? '#065f46' : task.status === 'in_progress' ? '#92400e' : '#334155',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginLeft: '0.5rem'
                      }}>
                        {task.status === 'complete' ? '✓ Complete' : task.status === 'in_progress' ? '⟳ In Progress' : '○ To Do'}
                      </span>
                    )}
                  </div>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
                    {task.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#667eea', fontWeight: 500 }}>
                      📋 {task.meeting_title}
                    </span>
                    {task.meeting_date && (
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        📅 {new Date(task.meeting_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.due_date && (
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        ⏰ Due: {task.due_date}
                      </span>
                    )}
                  </div>
                  {task.context && (
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Context: {task.context}
                    </p>
                  )}
                  {task.source_line && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ fontSize: '0.85rem', color: '#667eea', cursor: 'pointer' }}>
                        View source quote
                      </summary>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '4px' }}>
                        "{task.source_line}"
                      </p>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default UserProfile

