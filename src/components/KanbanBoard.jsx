import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { api } from '../utils/api'

const COLUMNS = {
  todo: { id: 'todo', title: 'To Do', color: '#e2e8f0' },
  in_progress: { id: 'in_progress', title: 'In Progress', color: '#fef3c7' },
  complete: { id: 'complete', title: 'Complete', color: '#d1fae5' }
}

function KanbanBoard({ actions, meetingId, onUpdate }) {
  const [columns, setColumns] = useState({
    todo: [],
    in_progress: [],
    complete: []
  })

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

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceColumn = columns[source.droppableId]
    const destColumn = columns[destination.droppableId]
    const action = sourceColumn.find(a => a.id === draggableId)

    if (!action) return

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
                  {columns[column.id]?.map((action, index) => (
                    <Draggable key={action.id} draggableId={action.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="kanban-card"
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                            transform: snapshot.isDragging
                              ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                              : provided.draggableProps.style?.transform
                          }}
                        >
                          <div style={{ marginBottom: '0.5rem' }}>
                            <span className={`intent-badge intent-${action.intent.toLowerCase()}`}>
                              {action.intent}
                            </span>
                          </div>
                          <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
                            {action.description}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="owner-tag" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                              {action.owner}
                            </span>
                            {action.due_date && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                📅 {action.due_date}
                              </span>
                            )}
                          </div>
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
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}

export default KanbanBoard

