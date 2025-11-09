import axios from 'axios'

const API_BASE_URL = '/api'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Improve error messages
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data
      const url = error.config?.url || ''
      
      // Don't log 404 errors for user lookup endpoints (expected for team names)
      const isUserLookup404 = error.response.status === 404 && url.includes('/users/by-name/')
      
      // Handle empty response data
      if (!errorData || errorData === '') {
        error.message = `Server error: ${error.response.status} ${error.response.statusText || 'Internal Server Error'}`
      } else if (typeof errorData === 'object') {
        // Ensure error message is a string
        if (errorData.error && typeof errorData.error === 'string') {
          error.message = errorData.error
        } else if (errorData.message && typeof errorData.message === 'string') {
          error.message = errorData.message
        } else if (!error.message || error.message === '') {
          error.message = `Server error: ${error.response.status} ${error.response.statusText || ''}`
        }
      } else if (typeof errorData === 'string' && errorData.trim() !== '') {
        error.message = errorData
      } else if (!error.message || error.message === '') {
        error.message = `Server error: ${error.response.status}`
      }
      
      // Log error for debugging (but skip 404s for user lookups)
      if (!isUserLookup404) {
        console.error('API Error:', {
          message: error.message,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: url
        })
      }
    } else if (error.request) {
      // Request was made but no response received
      error.message = 'Unable to connect to server. Please check your connection and ensure the backend is running.'
    } else if (!error.message || error.message === '') {
      // Something else happened
      error.message = 'An unexpected error occurred'
    }
    
    return Promise.reject(error)
  }
)

// Add token to requests
let authToken = null

export const api = {
  setToken: (token) => {
    authToken = token
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete apiClient.defaults.headers.common['Authorization']
    }
  },

  // Authentication endpoints
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  },

  signup: async (email, password, name, role) => {
    const response = await apiClient.post('/auth/register', { email, password, name, role })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  // Meeting endpoints
  processTranscript: async (transcript, title) => {
    const response = await apiClient.post('/process', {
      transcript,
      title
    })
    return response.data
  },

  transcribeAudio: async (audioFile) => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    const response = await apiClient.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  getMeetings: async () => {
    const response = await apiClient.get('/meetings')
    return response.data
  },

  getMeeting: async (id) => {
    const response = await apiClient.get(`/meetings/${id}`)
    return response.data
  },

  deleteMeeting: async (id) => {
    const response = await apiClient.delete(`/meetings/${id}`)
    return response.data
  },

  updateAction: async (meetingId, actionId, updates) => {
    const response = await apiClient.patch(
      `/meetings/${meetingId}/actions/${actionId}`,
      updates
    )
    return response.data
  },

  exportMeeting: async (meetingId, format = 'full', owner = null) => {
    const params = { format }
    if (owner) params.owner = owner
    const response = await apiClient.get(
      `/meetings/${meetingId}/export`,
      { params }
    )
    return response.data
  },

  createShareLink: async (meetingId) => {
    const response = await apiClient.post(`/meetings/${meetingId}/share`)
    return response.data
  },

  sendMeetingEmail: async (meetingId, emails, emailType = 'summary') => {
    const response = await apiClient.post(`/meetings/${meetingId}/email`, {
      emails,
      type: emailType
    })
    return response.data
  },

  // Admin endpoints
  getAllUsers: async () => {
    const response = await apiClient.get('/admin/users')
    return response.data
  },

  updateUserRole: async (userId, role) => {
    const response = await apiClient.patch(`/admin/users/${userId}/role`, { role })
    return response.data
  },

  resetUserPassword: async (userId, password) => {
    const response = await apiClient.post(`/admin/users/${userId}/password`, { password })
    return response.data
  },

  // User profile endpoints
  getMyTasks: async () => {
    const response = await apiClient.get('/users/me/tasks')
    return response.data
  },

  getUserTasks: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/tasks`)
    return response.data
  },

  getUserByName: async (name) => {
    const response = await apiClient.get(`/users/by-name/${encodeURIComponent(name)}`)
    return response.data
  }
}

