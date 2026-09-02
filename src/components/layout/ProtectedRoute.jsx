import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/core/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.email_confirmed_at) return <Navigate to="/verify-email" replace />

  return children
}