import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './components/Dashboard'
import UploadTranscript from './components/UploadTranscript'
import MeetingView from './components/MeetingView'
import AdminPanel from './components/AdminPanel'
import UserProfile from './components/UserProfile'
import Calendar from './components/Calendar'
import Metrics from './components/Metrics'
import Login from './components/Login'
import Signup from './components/Signup'
import './styles/index.css'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public Route Component (redirects to dashboard if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

// Admin Route Component (requires admin role)
function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'Admin') {
    return (
      <div className="container">
        <div className="card">
          <h2>Access Denied</h2>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>
            Only administrators can upload transcripts.
          </p>
          <button onClick={() => window.history.back()} className="btn btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return children
}

// Header component with user info
function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>🚦 AI Meeting Action Tracker</h1>
          <p>Transform transcripts into actionable project management artifacts</p>
        </div>
        {user ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <Link 
                to={`/profile/${user.id}`} 
                style={{ 
                  textDecoration: 'none', 
                  color: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 500, color: '#334155' }}>
                  {user.name || user.email}
                </div>
                {user.role && (
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {user.role}
                  </div>
                )}
              </Link>
            </div>
            {user.role === 'Admin' && (
              <Link to="/admin" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                👥 Admin Panel
              </Link>
            )}
            {user.role === 'Admin' && (
              <Link to="/upload" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                + New Transcript
              </Link>
            )}
            <Link to="/calendar" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              📅 Calendar
            </Link>
            <Link to="/metrics" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              📊 Metrics
            </Link>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <AdminRoute>
            <UploadTranscript />
          </AdminRoute>
        }
      />
      <Route
        path="/meeting/:id"
        element={
          <ProtectedRoute>
            <MeetingView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/metrics"
        element={
          <ProtectedRoute>
            <Metrics />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <AppHeader />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
