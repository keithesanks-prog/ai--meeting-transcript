import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { api } from '../utils/api'
import TaskDetailModal from './TaskDetailModal'

const COLUMNS = {
  todo: { id: 'todo', title: 'To Do', color: '#e2e8f0' },
  in_progress: { id: 'in_progress', title: 'In Progress', color: '#fef3c7' },
  complete: { id: 'complete', title: 'Complete', color: '#d1fae5' }
}

function KanbanBoard({ actions, meetingId, onUpdate, currentUser, meetingOwnerId }) {
  const [columns, setColumns] = useState({
    todo: [],
    in_progress: [],
    complete: []
  })
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    // Initialize columns with actions
    const todo = actions.filter(a => !a.status || a.status === 'todo')
    const inProgress = actions.filter(a => a.status === 'in_progress')
    const complete = actions.filter(a => a.status === 'complete')

    setColumns({
      todo,
      in_progress: inProgress,
      complete
    })
  }, [actions])

  // Helper function to check if current user owns this task
  const isMyTask = (action) => {
    if (!currentUser) return false
    
    // Primary check: match by owner_id (most reliable)
    const taskOwnerId = action.owner_id
    if (taskOwnerId && taskOwnerId === currentUser.id) {
      return true
    }
    
    // Fallback: match by name/email (for backward compatibility)
    const taskOwner = action.owner || ''
    const userName = currentUser.name || ''
    const userEmail = currentUser.email || ''
    
    return (
      taskOwner === userName ||
      taskOwner === userEmail ||
      taskOwner.toLowerCase() === userName.toLowerCase() ||
      taskOwner.toLowerCase() === userEmail.toLowerCase()
    )
  }

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
        return depAction ? depAction.description : `Task ${depId}`
      })
      .filter(Boolean)
  }

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceColumn = columns[source.droppableId]
    const destColumn = columns[destination.droppableId]
    const action = sourceColumn.find(a => a.id === draggableId)

    if (!action) return

    // Check if user owns this task - prevent dragging if not
    if (!isMyTask(action)) {
      alert('You can only move tasks assigned to you')
      return
    }

    // Check if task is blocked when trying to move to "in_progress"
    if (destination.droppableId === 'in_progress' && isTaskBlocked(action)) {
      const deps = getDependencyDescriptions(action)
      alert(`Cannot start this task. It depends on:\n${deps.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\nPlease complete the dependencies first.`)
      return
    }

    // Update local state optimistically
    const newSourceColumn = Array.from(sourceColumn)
    newSourceColumn.splice(source.index, 1)

    const newDestColumn = Array.from(destColumn)
    newDestColumn.splice(destination.index, 0, action)

    const newColumns = {
      ...columns,
      [source.droppableId]: newSourceColumn,
      [destination.droppableId]: newDestColumn
    }

    setColumns(newColumns)

    // Update backend
    try {
      await api.updateAction(meetingId, draggableId, {
        status: destination.droppableId,
        column: destination.droppableId
      })
      onUpdate()
    } catch (err) {
      console.error('Failed to update action:', err)
      // Revert on error
      setColumns(columns)
      
      // Show error message if it's an authorization error
      if (err.response?.status === 403) {
        const errorMsg = err.response?.data?.error || 'You can only update tasks assigned to you'
        alert(errorMsg)
      }
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {Object.values(COLUMNS).map((column) => (
          <div key={column.id} className="kanban-column">
            <div className="kanban-column-header" style={{ color: column.color }}>
              {column.title} ({columns[column.id]?.length || 0})
            </div>
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    background: snapshot.isDraggingOver ? '#f1f5f9' : 'transparent',
                    minHeight: '200px',
                    borderRadius: '8px',
                    padding: snapshot.isDraggingOver ? '0.5rem' : '0'
                  }}
                >
                  {columns[column.id]?.map((action, index) => {
                    const canDrag = isMyTask(action)
                    return (
                      <Draggable 
                        key={action.id} 
                        draggableId={action.id} 
                        index={index}
                        isDragDisabled={!canDrag}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="kanban-card"
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : (canDrag ? 1 : 0.6),
                              transform: snapshot.isDragging
                                ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                : provided.draggableProps.style?.transform,
                              borderLeft: isTaskBlocked(action) && action.status !== 'complete' 
                                ? '4px solid #ef4444' 
                                : '4px solid transparent',
                            cursor: canDrag ? 'grab' : 'not-allowed',
                            background: canDrag ? 'white' : '#f8fafc'
                          }}
                          title={canDrag ? 'Drag to move or click "View Details" button' : 'Click "View Details" button'}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setSelectedTask(action)
                          }}
                        >
                            {!canDrag && (
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#64748b', 
                                marginBottom: '0.5rem',
                                fontStyle: 'italic'
                              }}>
                                🔒 Not your task
                              </div>
                            )}
                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span className={`intent-badge intent-${action.intent.toLowerCase()}`}>
                                {action.intent}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span className="owner-tag" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                                {action.owner}
                              </span>
                              {action.due_date && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  📅 {action.due_date}
                                </span>
                              )}
                            </div>
                            {action.dependencies && action.dependencies.length > 0 && (
                              <details style={{ marginTop: '0.5rem' }}>
                                <summary style={{ fontSize: '0.75rem', color: '#667eea', cursor: 'pointer' }}>
                                  Dependencies ({action.dependencies.length})
                                </summary>
                                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                                  {action.dependencies.map((depId, idx) => {
                                    const depAction = actions.find(a => a.id === depId)
                                    const depDescription = depAction ? depAction.description : `Task ${depId}`
                                    const isCompleted = depAction?.status === 'complete'
                                    return (
                                      <div key={idx} style={{ 
                                        color: isCompleted ? '#10b981' : '#ef4444',
                                        marginTop: '0.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                      }}>
                                        {isCompleted ? '✅' : '⏳'} {depDescription}
                                      </div>
                                    )
                                  })}
                                </div>
                              </details>
                            )}
                            {action.comments && action.comments.length > 0 && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                💬 {action.comments.length} comment{action.comments.length !== 1 ? 's' : ''}
                              </div>
                            )}
                            {action.change_requests && action.change_requests.filter(cr => cr.status === 'pending').length > 0 && (
                              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#f59e0b' }}>
                                🔔 {action.change_requests.filter(cr => cr.status === 'pending').length} pending change request{action.change_requests.filter(cr => cr.status === 'pending').length !== 1 ? 's' : ''}
                              </div>
                            )}
                            {action.source_line && (
                              <details style={{ marginTop: '0.5rem' }}>
                                <summary style={{ fontSize: '0.75rem', color: '#667eea', cursor: 'pointer' }}>
                                  Source
                                </summary>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
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
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          meetingId={meetingId}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            setSelectedTask(null)
            onUpdate()
          }}
          allActions={actions}
          meetingOwnerId={meetingOwnerId}
        />
      )}
    </DragDropContext>
  )
}

export default KanbanBoard

