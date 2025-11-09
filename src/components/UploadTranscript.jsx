import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

function UploadTranscript() {
  const [transcript, setTranscript] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState(null)
  const [uploadMode, setUploadMode] = useState('text') // 'text' or 'audio'
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!transcript.trim()) {
      setError('Please enter a transcript')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await api.processTranscript(transcript, title || 'Untitled Meeting')
      navigate(`/meeting/${result.id}`)
    } catch (err) {
      console.error('Process transcript error:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to process transcript'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('dragover')
  }

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('dragover')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragover')
    
    const file = e.dataTransfer.files[0]
    if (uploadMode === 'text' && file && file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (event) => {
        setTranscript(event.target.result)
      }
      reader.readAsText(file)
    } else if (uploadMode === 'audio' && file && file.type.startsWith('audio/')) {
      handleAudioFileSelect(file)
    }
  }

  const handleAudioFileSelect = async (file) => {
    setError(null)
    setTranscribing(true)
    
    try {
      const result = await api.transcribeAudio(file)
      setTranscript(result.transcript)
      setError(null)
    } catch (err) {
      console.error('Transcription error:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to transcribe audio'
      setError(errorMessage)
    } finally {
      setTranscribing(false)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (uploadMode === 'audio') {
        handleAudioFileSelect(file)
      } else if (file.type === 'text/plain') {
        const reader = new FileReader()
        reader.onload = (event) => {
          setTranscript(event.target.result)
        }
        reader.readAsText(file)
      }
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleTranscribeRecording = async () => {
    if (!audioBlob) return
    
    setError(null)
    setTranscribing(true)
    
    try {
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
      const result = await api.transcribeAudio(audioFile)
      setTranscript(result.transcript)
      setError(null)
    } catch (err) {
      console.error('Transcription error:', err)
      const errorMessage = err.message || err.response?.data?.error || 'Failed to transcribe audio'
      setError(errorMessage)
    } finally {
      setTranscribing(false)
    }
  }

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    chunksRef.current = []
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Upload Meeting Transcript</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Upload a transcript or record/upload audio. The AI will extract actions, decisions, and blockers.
        </p>

        {/* Mode Toggle */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              setUploadMode('text')
              clearRecording()
            }}
            className={uploadMode === 'text' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1 }}
          >
            📄 Text Transcript
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode('audio')
              clearRecording()
            }}
            className={uploadMode === 'audio' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1 }}
          >
            🎤 Audio Recording
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="meeting-title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Meeting Title (optional)
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q4 Planning Meeting"
              aria-label="Meeting title"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>

          {uploadMode === 'text' ? (
            <>
              <div
                className="upload-area"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ marginBottom: '1rem' }}
              >
                <p>📄 Drag and drop a text file here, or paste transcript below</p>
              </div>

              <label htmlFor="transcript-textarea" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Meeting Transcript
              </label>
              <textarea
                id="transcript-textarea"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your meeting transcript here..."
                aria-label="Meeting transcript"
                style={{ marginBottom: '1rem' }}
              />
            </>
          ) : (
            <>
              {/* Audio Recording Section */}
              <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Record Audio</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  {!isRecording && !audioBlob && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      🎤 Start Recording
                    </button>
                  )}
                  {isRecording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="btn btn-secondary"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      ⏹️ Stop Recording
                    </button>
                  )}
                  {audioBlob && (
                    <>
                      <button
                        type="button"
                        onClick={handleTranscribeRecording}
                        className="btn btn-primary"
                        disabled={transcribing}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {transcribing ? '⏳ Transcribing...' : '📝 Transcribe Recording'}
                      </button>
                      <button
                        type="button"
                        onClick={clearRecording}
                        className="btn btn-secondary"
                      >
                        🗑️ Clear
                      </button>
                    </>
                  )}
                </div>
                {isRecording && (
                  <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
                    🔴 Recording in progress...
                  </div>
                )}
                {audioUrl && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Recorded Audio:</p>
                    <audio controls src={audioUrl} style={{ width: '100%' }} />
                  </div>
                )}
              </div>

              {/* Audio File Upload Section */}
              <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Upload Audio File</h3>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileInputChange}
                  disabled={transcribing}
                  style={{ marginBottom: '1rem' }}
                />
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Supported formats: MP3, MP4, WAV, WebM, M4A
                </p>
              </div>

              {/* Transcript Display */}
              {transcript && (
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="transcript-textarea" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Transcribed Transcript
                  </label>
                  <textarea
                    id="transcript-textarea"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Transcribed text will appear here..."
                    aria-label="Meeting transcript"
                    style={{ marginBottom: '1rem' }}
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{
              padding: '1rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {transcribing && (
            <div style={{
              padding: '1rem',
              background: '#eff6ff',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '0.5rem' }}>Transcribing audio...</p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || transcribing || !transcript.trim()}
            style={{ width: '100%' }}
          >
            {loading ? 'Processing...' : 'Process Transcript'}
          </button>
        </form>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem' }}>Analyzing transcript with AI...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadTranscript

