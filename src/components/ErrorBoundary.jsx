import { Component } from 'react'
import { TriangleAlert, RotateCw, ArrowLeft } from 'lucide-react'

const button = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 18px', borderRadius: 4, cursor: 'pointer',
  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1,
  border: '1px solid var(--accent)',
}

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
        <div
          role="alert"
          style={{
            minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: 24, textAlign: 'center',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', marginBottom: 4,
            background: 'var(--topbar-hover)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TriangleAlert size={22} aria-hidden="true" />
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, letterSpacing: 2, color: 'var(--accent)' }}>
            SYSTEM ERROR
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', maxWidth: '34ch' }}>
            Something went wrong on this page. Trying again usually fixes it.
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
            padding: '6px 10px', maxWidth: '90%', overflowWrap: 'anywhere',
          }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ ...button, background: 'var(--accent)', color: 'var(--bg)' }}
            >
              <RotateCw size={13} aria-hidden="true" /> TRY AGAIN
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/feed' }}
              style={{ ...button, background: 'transparent', color: 'var(--accent)' }}
            >
              <ArrowLeft size={13} aria-hidden="true" /> BACK TO FEED
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
