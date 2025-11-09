import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import TaskDetailModal from './TaskDetailModal'

function ActionTriage({ actions, activeFilter, onFilterChange, draftActions, meetingId, onUpdate, meetingOwnerId }) {
  const [showDrafts, setShowDrafts] = useState(false)
  const navigate = useNavigate()
  const [ownerUserIds, setOwnerUserIds] = useState({})
  const [selectedTask, setSelectedTask] = useState(null)

  // Helper function to check if a task is blocked (has incomplete dependencies)
  const isTaskBlocked = (action) => {
    if (!action.dependencies || action.dependencies.length === 0) {
      return false
    }
    
    // Get all completed action IDs
    const completedIds = new Set(
      actions
        .filter(a => a.status === 'complete')
        .map(a => a.id)
    )
    
    // Check if all dependencies are completed
    return !action.dependencies.every(depId => completedIds.has(depId))
  }

  // Helper function to get dependency descriptions
  const getDependencyDescriptions = (action) => {
    if (!action.dependencies || action.dependencies.length === 0) {
      return []
    }
    
    return action.dependencies
      .map(depId => {
        const depAction = actions.find(a => a.id === depId)
        return depAction ? { id: depId, description: depAction.description, completed: depAction?.status === 'complete' } : { id: depId, description: `Task ${depId}`, completed: false }
      })
      .filter(Boolean)
  }

  // Helper function to check if a name looks like a team name (not a person)
  const isLikelyTeamName = (name) => {
    if (!name) return true
    const lowerName = name.toLowerCase()
    return (
      name === 'UNASSIGNED' ||
      lowerName.includes("'s team") ||
      lowerName.includes(" team") ||
      lowerName.includes('team') ||
      lowerName.includes('qa') ||
      lowerName.includes('q&a') ||
      lowerName.includes('engineering') ||
      lowerName.includes('design') ||
      lowerName.includes('marketing') ||
      lowerName.includes('sales') ||
      lowerName.includes('support') ||
      lowerName.includes('department') ||
      lowerName.includes('group')
    )
  }

  // Fetch user IDs for owners
  useEffect(() => {
    const fetchUserIds = async () => {
      const ownerNames = [...new Set(actions.map(a => a.owner).filter(Boolean))]
      const userIds = {}
      
      for (const name of ownerNames) {
        // Skip team names and UNASSIGNED to avoid unnecessary API calls
        if (isLikelyTeamName(name)) continue
        
        try {
          const user = await api.getUserByName(name)
          if (user) {
            userIds[name] = user.id
          }
        } catch (err) {
          // User not found (404) is expected for team names or non-user owners
          // Silently skip - don't log 404 errors as they're normal
          if (err.response?.status !== 404) {
            console.warn(`Error fetching user for owner "${name}":`, err.message)
          }
        }
      }
      
      setOwnerUserIds(userIds)
    }
    
    if (actions.length > 0) {
      fetchUserIds()
    }
  }, [actions])

  const handleOwnerClick = (ownerName, e) => {
    e.stopPropagation()
    if (ownerName === 'UNASSIGNED' || !ownerUserIds[ownerName]) return
    navigate(`/profile/${ownerUserIds[ownerName]}`)
  }

  const filteredActions = showDrafts ? draftActions : actions.filter(a => {
    if (activeFilter === 'all') return true
    return a.intent === activeFilter
  })

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>🚦 Action Triage Center</h3>
      
      {/* Confidence Filter */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
        <strong>⚠️ Review Draft Actions ({draftActions.length})</strong>
        <p style={{ fontSize: '0.9rem', color: '#92400e', marginTop: '0.5rem' }}>
          {draftActions.length > 0 
            ? `You have ${draftActions.length} draft action(s) that need review. These are MEDIUM or LOW confidence extractions that may need verification.`
            : 'All actions have HIGH confidence!'}
        </p>
        {draftActions.length > 0 && (
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem' }}
          >
            {showDrafts ? 'Hide Drafts' : `Review ${draftActions.length} Draft Actions`}
          </button>
        )}
      </div>

      {/* Intent Filters */}
      <div className="filter-buttons">
        <button
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          All Items
        </button>
        <button
          className={`filter-btn ${activeFilter === 'ACTION' ? 'active' : ''}`}
          onClick={() => onFilterChange('ACTION')}
        >
          🎯 Actions Only
        </button>
        <button
          className={`filter-btn ${activeFilter === 'DECISION' ? 'active' : ''}`}
          onClick={() => onFilterChange('DECISION')}
        >
          💡 Decisions Only
        </button>
        <button
          className={`filter-btn ${activeFilter === 'BLOCKER' ? 'active' : ''}`}
          onClick={() => onFilterChange('BLOCKER')}
        >
          🚧 Blockers Only
        </button>
      </div>

      {/* Actions List */}
      <div style={{ marginTop: '1.5rem' }}>
        {filteredActions.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No actions found for this filter.
          </p>
        ) : (
          filteredActions.map((action) => (
            <div
              key={action.id}
              className={`action-item ${action.confidence.toLowerCase()}-confidence`}
            >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`intent-badge intent-${action.intent.toLowerCase()}`}>
                      {action.intent}
                    </span>
                    <span className={`confidence-badge confidence-${action.confidence.toLowerCase()}`}>
                      {action.confidence}
                    </span>
                    {isTaskBlocked(action) && action.status !== 'complete' && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        color: '#ef4444', 
                        fontWeight: 'bold',
                        padding: '0.2rem 0.4rem',
                        background: '#fee2e2',
                        borderRadius: '4px'
                      }}>
                        ⚠️ Blocked
                      </span>
                    )}
                  </div>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
                    {action.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span 
                      className="owner-tag"
                      onClick={(e) => handleOwnerClick(action.owner, e)}
                      style={{
                        cursor: ownerUserIds[action.owner] ? 'pointer' : 'default',
                        textDecoration: ownerUserIds[action.owner] ? 'underline' : 'none'
                      }}
                      title={ownerUserIds[action.owner] ? 'Click to view profile' : ''}
                    >
                      {action.owner}
                    </span>
                    {action.due_date && (
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        📅 {action.due_date}
                      </span>
                    )}
                  </div>
                  {action.dependencies && action.dependencies.length > 0 && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ fontSize: '0.85rem', color: '#667eea', cursor: 'pointer' }}>
                        Dependencies ({action.dependencies.length})
                      </summary>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                        {getDependencyDescriptions(action).map((dep, idx) => (
                          <div key={idx} style={{ 
                            color: dep.completed ? '#10b981' : '#ef4444',
                            marginTop: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            {dep.completed ? '✅' : '⏳'} {dep.description}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  {action.context && (
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Context: {action.context}
                    </p>
                  )}
                  {action.comments && action.comments.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                      💬 {action.comments.length} comment{action.comments.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {action.change_requests && action.change_requests.filter(cr => cr.status === 'pending').length > 0 && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#f59e0b' }}>
                      🔔 {action.change_requests.filter(cr => cr.status === 'pending').length} pending change request{action.change_requests.filter(cr => cr.status === 'pending').length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {action.source_line && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ fontSize: '0.85rem', color: '#667eea', cursor: 'pointer' }}>
                        View source quote
                      </summary>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '4px' }}>
                        "{action.source_line}"
                      </p>
                    </details>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTask(action)
                    }}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    View Details & Add Comments
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {selectedTask && meetingId && (
        <TaskDetailModal
          task={selectedTask}
          meetingId={meetingId}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            setSelectedTask(null)
            if (onUpdate) {
              onUpdate()
            }
          }}
          allActions={actions}
          meetingOwnerId={meetingOwnerId}
        />
      )}
    </div>
  )
}

export default ActionTriage

