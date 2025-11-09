import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { api } from '../utils/api'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea']

function Metrics() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const data = await api.getMetrics()
      setMetrics(data)
    } catch (err) {
      console.error('Failed to load metrics:', err)
    } finally {
      setLoading(false)
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

  if (!metrics) {
    return (
      <div className="container">
        <div className="card">
          <h2>No metrics available</h2>
        </div>
      </div>
    )
  }

  const statusData = [
    { name: 'Completed', value: metrics.summary.completed, color: '#10b981' },
    { name: 'In Progress', value: metrics.summary.in_progress, color: '#f59e0b' },
    { name: 'To Do', value: metrics.summary.todo, color: '#64748b' }
  ]

  const intentData = [
    { name: 'Actions', value: metrics.by_intent.actions },
    { name: 'Decisions', value: metrics.by_intent.decisions },
    { name: 'Blockers', value: metrics.by_intent.blockers }
  ]

  const confidenceData = [
    { name: 'High', value: metrics.by_confidence.high },
    { name: 'Medium', value: metrics.by_confidence.medium },
    { name: 'Low', value: metrics.by_confidence.low }
  ]

  const ownerData = Object.entries(metrics.by_owner).map(([owner, stats]) => ({
    name: owner,
    completion_rate: Math.round(stats.completion_rate),
    completed: stats.completed,
    total: stats.total
  }))

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>📊 Completion Metrics</h2>
        <button onClick={loadMetrics} className="btn btn-secondary">
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.summary.total_tasks}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Tasks</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.summary.completed}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Completed</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
          <div className="stat-value" style={{ color: 'white' }}>{metrics.summary.in_progress}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>In Progress</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
          <div className="stat-value" style={{ color: 'white' }}>{Math.round(metrics.summary.completion_rate)}%</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Completion Rate</div>
        </div>
      </div>

      {/* Completion Rate Progress */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Overall Completion Rate</h3>
        <div style={{ position: 'relative', width: '100%', height: '40px', background: '#e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${metrics.summary.completion_rate}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600
            }}
          >
            {metrics.summary.completion_rate > 10 && `${Math.round(metrics.summary.completion_rate)}%`}
          </div>
          {metrics.summary.completion_rate <= 10 && (
            <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#334155' }}>
              {Math.round(metrics.summary.completion_rate)}%
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Status Distribution */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Intent Distribution */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Tasks by Intent</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={intentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Distribution */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Tasks by Confidence</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#764ba2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Owner Completion Rates */}
      {ownerData.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Completion Rates by Owner</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ownerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'completion_rate') return [`${value}%`, 'Completion Rate']
                  return [value, name]
                }}
              />
              <Bar dataKey="completion_rate" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Owner Stats Table */}
          <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Owner</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Completed</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>In Progress</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>To Do</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {ownerData.map((owner, index) => {
                  const stats = metrics.by_owner[owner.name]
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{owner.name}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{stats.total}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#10b981' }}>{stats.completed}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#f59e0b' }}>{stats.in_progress}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>{stats.todo}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <div style={{ width: '100px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${owner.completion_rate}%`,
                                height: '100%',
                                background: owner.completion_rate >= 80 ? '#10b981' : owner.completion_rate >= 50 ? '#f59e0b' : '#ef4444',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 600, minWidth: '45px', textAlign: 'right' }}>
                            {owner.completion_rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Additional Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#667eea' }}>
              {metrics.meetings_count}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Meetings</div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
              {metrics.by_intent.actions}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Action Items</div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#764ba2' }}>
              {metrics.by_intent.decisions}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Decisions</div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
              {metrics.by_intent.blockers}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Blockers</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Metrics

