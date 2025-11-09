import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    // Check if user is logged in on mount
    if (token) {
      api.setToken(token)
      api.getCurrentUser()
        .then(userData => {
          setUser(userData)
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem('token')
          setToken(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password)
      const { token: newToken, user: userData } = response
      
      localStorage.setItem('token', newToken)
      setToken(newToken)
      api.setToken(newToken)
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      }
    }
  }

  const signup = async (email, password, name, role) => {
    try {
      const response = await api.signup(email, password, name, role)
      const { token: newToken, user: userData } = response
      
      localStorage.setItem('token', newToken)
      setToken(newToken)
      api.setToken(newToken)
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      console.error('Signup error:', error)
      console.error('Error response:', error.response)
      
      // Use error.message from axios interceptor (which handles empty responses)
      let errorMessage = error.message || 'Signup failed'
      
      // If we have a response but empty data, provide a helpful message
      if (error.response && (!error.response.data || error.response.data === '')) {
        errorMessage = `Server error (${error.response.status}): The backend encountered an error. Please check the backend logs for details.`
      } else if (error.response?.data) {
        // Server responded with error status - use the error message from response
        errorMessage = error.response.data.error || error.response.data.message || error.message || `Server error: ${error.response.status}`
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = error.message || 'Unable to connect to server. Please check your connection and ensure the backend is running.'
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    api.setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

