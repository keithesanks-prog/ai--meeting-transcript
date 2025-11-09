import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const ROLES = [
  'Engineer',
  'Admin',
  'Design',
  'PM',
  'Legal',
  'Marketing',
  'Sales',
  'Product',
  'Operations',
  'Finance',
  'HR',
  'Support',
  'Other'
]

function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingUserId, setEditingUserId] = useState(null)
  const [newRole, setNewRole] = useState('')
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await api.getAllUsers()
      setUsers(data)
      setError('')
    } catch (err) {
      console.error('Load users error:', err)
      if (err.response?.status === 403) {
        setError('You do not have admin access')
        setTimeout(() => navigate('/'), 2000)
      } else {
        const errorMessage = err.message || err.response?.data?.error || 'Failed to load users'
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditRole = (user) => {
    setEditingUserId(user.id)
    setNewRole(user.role)
  }

  const handleSaveRole = async (userId) => {
    try {
      await api.updateUserRole(userId, newRole)
      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setEditingUserId(null)
      setNewRole('')
      setError('')
    } catch (err) {
      console.error('Update role error:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to update user role'
      setError(errorMessage)
    }
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setNewRole('')
  }

  const handleResetPassword = (user) => {
    setResettingPasswordUserId(user.id)
    setNewPassword('')
    setShowPassword(false)
  }

  const handleSavePassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      await api.resetUserPassword(userId, newPassword)
      setResettingPasswordUserId(null)
      setNewPassword('')
      setShowPassword(false)
      setError('')
      alert('Password reset successfully!')
    } catch (err) {
      console.error('Reset password error:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to reset password'
      setError(errorMessage)
    }
  }

  const handleCancelPasswordReset = () => {
    setResettingPasswordUserId(null)
    setNewPassword('')
    setShowPassword(false)
  }

  const generateRandomPassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setNewPassword(password)
  }

  // Group users by role
  const usersByRole = {}
  users.forEach(user => {
    const role = user.role || 'Other'
    if (!usersByRole[role]) {
      usersByRole[role] = []
    }
    usersByRole[role].push(user)
  })

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error && error.includes('admin access')) {
    return (
      <div className="container">
        <div className="card">
          <h2>Access Denied</h2>
          <p style={{ color: '#ef4444' }}>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>👥 Admin Panel - User Management</h2>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="card" style={{ background: '#fee2e2', color: '#991b1b', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>All Users ({users.length})</h3>
        
        {/* Summary by Role */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          {Object.entries(usersByRole).map(([role, roleUsers]) => (
            <div
              key={role}
              style={{
                padding: '0.75rem 1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '2px solid #e2e8f0'
              }}
            >
              <strong>{role}:</strong> {roleUsers.length}
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Current Role</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>{user.name || 'N/A'}</td>
                  <td style={{ padding: '1rem' }}>{user.email}</td>
                  <td style={{ padding: '1rem' }}>
                    {editingUserId === user.id ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        aria-label={`Change role for ${user.name || user.email}`}
                        style={{
                          padding: '0.5rem',
                          border: '2px solid #667eea',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          background: '#e2e8f0',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        {user.role || 'Other'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {editingUserId === user.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleSaveRole(user.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : resettingPasswordUserId === user.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '250px' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              border: '2px solid #667eea',
                              borderRadius: '6px',
                              fontSize: '0.9rem'
                            }}
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? '🙈' : '👁️'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={generateRandomPassword}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flex: 1 }}
                          >
                            Generate
                          </button>
                          <button
                            onClick={() => handleSavePassword(user.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            disabled={!newPassword || newPassword.length < 6}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelPasswordReset}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEditRole(user)}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="btn btn-secondary"
                          style={{ 
                            padding: '0.5rem 1rem', 
                            fontSize: '0.85rem',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: 'none'
                          }}
                        >
                          🔑 Reset Password
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
            No users found
          </p>
        )}
      </div>
    </div>
  )
}

export default AdminPanel

