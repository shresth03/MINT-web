import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#080c10',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          color: '#4a6080'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, color: '#1e2d3d' }}>⬡</div>
          <div style={{ fontSize: 12, letterSpacing: 2, color: '#00d4ff', marginBottom: 8 }}>
            MINT — SYSTEM ERROR
          </div>
          <div style={{ fontSize: 11, marginBottom: 24, color: '#4a6080' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid #1e2d3d',
              color: '#4a6080',
              borderRadius: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              cursor: 'pointer',
              letterSpacing: 1
            }}
          >
            ↩ RETURN TO FEED
          </button>
        </div>
      )
    }

    return this.props.children
  }
}