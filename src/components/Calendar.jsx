import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' or 'week'
  const navigate = useNavigate()

  useEffect(() => {
    loadCalendarData()
  }, [])

  const loadCalendarData = async () => {
    try {
      setLoading(true)
      const data = await api.getCalendarData()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Failed to load calendar data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const getEventsForDate = (date) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      try {
        const eventDate = new Date(event.date)
        if (isNaN(eventDate.getTime())) return false
        const eventDateStr = eventDate.toISOString().split('T')[0]
        return eventDateStr === dateStr
      } catch (e) {
        return false
      }
    })
  }

  const formatDate = (date) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(selectedDate.getMonth() + direction)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = getDaysInMonth(selectedDate)
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

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
        <h2>📅 Calendar</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={goToToday} className="btn btn-secondary">
            Today
          </button>
          <button onClick={() => navigateMonth(-1)} className="btn btn-secondary">
            ← Prev
          </button>
          <button onClick={() => navigateMonth(1)} className="btn btn-secondary">
            Next →
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>{monthName}</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {weekDays.map(day => (
            <div key={day} style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
              {day}
            </div>
          ))}
          
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isToday = day && day.toDateString() === new Date().toDateString()
            
            return (
              <div
                key={index}
                style={{
                  minHeight: '100px',
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  background: isToday ? '#eff6ff' : 'white',
                  cursor: day ? 'pointer' : 'default'
                }}
              >
                {day && (
                  <>
                    <div style={{ 
                      fontWeight: isToday ? 700 : 500, 
                      marginBottom: '0.5rem',
                      color: isToday ? '#2563eb' : '#334155'
                    }}>
                      {day.getDate()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (event.type === 'meeting') {
                              navigate(`/meeting/${event.meeting_id}`)
                            } else if (event.type === 'task') {
                              navigate(`/meeting/${event.meeting_id}`)
                            }
                          }}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            background: event.type === 'meeting' ? '#667eea' : 
                                       event.status === 'complete' ? '#d1fae5' :
                                       event.status === 'in_progress' ? '#fef3c7' : '#e2e8f0',
                            color: event.type === 'meeting' ? 'white' : '#334155',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={event.title}
                        >
                          {event.type === 'meeting' ? '📅 ' : '✓ '}
                          {event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.25rem' }}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Upcoming Events</h3>
        {events.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No upcoming events
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 10)
              .map((event) => (
                <div
                  key={`${event.type}-${event.id}`}
                  onClick={() => {
                    if (event.type === 'meeting') {
                      navigate(`/meeting/${event.meeting_id}`)
                    } else if (event.type === 'task') {
                      navigate(`/meeting/${event.meeting_id}`)
                    }
                  }}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: event.type === 'meeting' ? '#667eea' : 
                                     event.status === 'complete' ? '#d1fae5' :
                                     event.status === 'in_progress' ? '#fef3c7' : '#e2e8f0',
                          color: event.type === 'meeting' ? 'white' : '#334155'
                        }}>
                          {event.type === 'meeting' ? '📅 Meeting' : 
                           event.status === 'complete' ? '✓ Complete' :
                           event.status === 'in_progress' ? '⏳ In Progress' : '📋 To Do'}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                        {event.title}
                      </div>
                      {event.type === 'task' && (
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Owner: {event.owner} • {event.meeting_title}
                        </div>
                      )}
                      {event.type === 'meeting' && (
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Meeting
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Calendar

