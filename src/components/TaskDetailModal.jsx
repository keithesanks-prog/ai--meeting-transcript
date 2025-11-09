import React, { useState } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

function TaskDetailModal({ task, meetingId, onClose, onUpdate, allActions, meetingOwnerId }) {
  const { user } = useAuth()
  const [commentText, setCommentText] = useState('')
  const [changeRequestText, setChangeRequestText] = useState('')
  const [activeTab, setActiveTab] = useState('details') // 'details', 'comments', 'change-requests'
  const [submitting, setSubmitting] = useState(false)

  if (!task) return null

  // Check if user can approve/reject change requests (task owner or meeting owner)
  const canApproveChangeRequests = () => {
    if (!user) return false
    const taskOwnerId = task.owner_id
    const isTaskOwner = taskOwnerId === user.id
    const isMeetingOwner = meetingOwnerId === user.id
    return isTaskOwner || isMeetingOwner
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || submitting) return

    setSubmitting(true)
    try {
      await api.addComment(meetingId, task.id, commentText)
      setCommentText('')
      onUpdate()
    } catch (err) {
      alert(`Failed to add comment: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddChangeRequest = async (e) => {
    e.preventDefault()
    if (!changeRequestText.trim() || submitting) return

    setSubmitting(true)
    try {
      await api.addChangeRequest(meetingId, task.id, changeRequestText)
      setChangeRequestText('')
      onUpdate()
    } catch (err) {
      alert(`Failed to add change request: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateChangeRequestStatus = async (requestId, status) => {
    if (submitting) return

    setSubmitting(true)
    try {
      await api.updateChangeRequestStatus(meetingId, task.id, requestId, status)
      onUpdate()
    } catch (err) {
      alert(`Failed to update change request: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return dateString
    }
  }

  const getDependencyDescriptions = (depIds) => {
    if (!depIds || depIds.length === 0) return []
    return depIds.map(depId => {
      const depAction = allActions.find(a => a.id === depId)
      return depAction ? { id: depId, description: depAction.description, completed: depAction?.status === 'complete' } : { id: depId, description: `Task ${depId}`, completed: false }
    }).filter(Boolean)
  }

  const isTaskBlocked = () => {
    if (!task.dependencies || task.dependencies.length === 0) return false
    const completedIds = new Set(
      allActions.filter(a => a.status === 'complete').map(a => a.id)
    )
    return !task.dependencies.every(depId => completedIds.has(depId))
  }

  const pendingChangeRequests = task.change_requests?.filter(cr => cr.status === 'pending') || []
  const comments = task.comments || []
  const changeRequests = task.change_requests || []

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
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
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Task Details</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'details' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'details' ? '#667eea' : '#64748b'
            }}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'comments' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'comments' ? '#667eea' : '#64748b',
              position: 'relative'
            }}
          >
            Comments {comments.length > 0 && `(${comments.length})`}
          </button>
          <button
            onClick={() => setActiveTab('change-requests')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'change-requests' ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === 'change-requests' ? '#667eea' : '#64748b',
              position: 'relative'
            }}
          >
            Change Requests {pendingChangeRequests.length > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                marginLeft: '0.25rem'
              }}>
                {pendingChangeRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`intent-badge intent-${task.intent?.toLowerCase()}`}>
                  {task.intent}
                </span>
                <span className={`confidence-badge confidence-${task.confidence?.toLowerCase()}`}>
                  {task.confidence}
                </span>
                {isTaskBlocked() && (
                  <span style={{ 
                    fontSize: '0.75rem', 
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
              <h3 style={{ marginTop: 0 }}>{task.description}</h3>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>Owner:</strong> <span className="owner-tag">{task.owner}</span>
                </div>
                {task.due_date && (
                  <div>
                    <strong>Due Date:</strong> {task.due_date}
                  </div>
                )}
                {task.status && (
                  <div>
                    <strong>Status:</strong> {task.status.replace('_', ' ').toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {task.dependencies && task.dependencies.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '4px' }}>
                <strong>Dependencies:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {getDependencyDescriptions(task.dependencies).map((dep, idx) => (
                    <li key={idx} style={{ color: dep.completed ? '#10b981' : '#ef4444' }}>
                      {dep.completed ? '✅' : '⏳'} {dep.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {task.source_line && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '4px' }}>
                <strong>Source:</strong>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#64748b' }}>
                  "{task.source_line}"
                </p>
              </div>
            )}

            {task.context && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '4px' }}>
                <strong>Context:</strong>
                <p style={{ marginTop: '0.5rem', color: '#64748b' }}>{task.context}</p>
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Comments ({comments.length})</h3>
              {comments.length === 0 ? (
                <p style={{ color: '#64748b', fontStyle: 'italic' }}>No comments yet.</p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                  {comments.map((comment) => (
                    <div key={comment.id} style={{ 
                      padding: '0.75rem', 
                      marginBottom: '0.5rem', 
                      background: '#f8fafc', 
                      borderRadius: '4px' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong>{comment.user_name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p style={{ margin: 0 }}>{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddComment}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  fontFamily: 'inherit'
                }}
              />
              <button 
                type="submit" 
                disabled={!commentText.trim() || submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Adding...' : 'Add Comment'}
              </button>
            </form>
          </div>
        )}

        {/* Change Requests Tab */}
        {activeTab === 'change-requests' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Change Requests ({changeRequests.length})</h3>
              {changeRequests.length === 0 ? (
                <p style={{ color: '#64748b', fontStyle: 'italic' }}>No change requests yet.</p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                  {changeRequests.map((cr) => (
                    <div key={cr.id} style={{ 
                      padding: '0.75rem', 
                      marginBottom: '0.5rem', 
                      background: '#f8fafc', 
                      borderRadius: '4px',
                      borderLeft: `4px solid ${
                        cr.status === 'approved' ? '#10b981' : 
                        cr.status === 'rejected' ? '#ef4444' : 
                        '#f59e0b'
                      }`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div>
                          <strong>{cr.user_name}</strong>
                          <span style={{ 
                            marginLeft: '0.5rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: cr.status === 'approved' ? '#d1fae5' : 
                                       cr.status === 'rejected' ? '#fee2e2' : 
                                       '#fef3c7',
                            color: cr.status === 'approved' ? '#065f46' : 
                                   cr.status === 'rejected' ? '#991b1b' : 
                                   '#92400e'
                          }}>
                            {cr.status.toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formatDate(cr.created_at)}
                        </span>
                      </div>
                      <p style={{ margin: '0.5rem 0' }}>{cr.request}</p>
                      {canApproveChangeRequests() && cr.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            onClick={() => handleUpdateChangeRequestStatus(cr.id, 'approved')}
                            disabled={submitting}
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateChangeRequestStatus(cr.id, 'rejected')}
                            disabled={submitting}
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddChangeRequest}>
              <textarea
                value={changeRequestText}
                onChange={(e) => setChangeRequestText(e.target.value)}
                placeholder="Describe the change you'd like to request..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  fontFamily: 'inherit'
                }}
              />
              <button 
                type="submit" 
                disabled={!changeRequestText.trim() || submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Submitting...' : 'Request Change'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskDetailModal

