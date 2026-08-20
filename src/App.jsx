import ProfilePage from './pages/account/ProfilePage'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrototypePage from './pages/feed/PrototypePage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyEmail from './pages/auth/VerifyEmail'
import ResetPassword from './pages/auth/ResetPassword'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProtectedRoute from './components/layout/ProtectedRoute'
import NotFound from './pages/public/NotFound'
import SearchPage from './pages/social/SearchPage'
import ChannelPage from './pages/social/ChannelPage'
import MessagesPage from './pages/social/MessagesPage'
import FeedbackPage from './pages/support/FeedbackPage'
import ArticlesPage from './pages/feed/ArticlesPage'
import LivePage from './pages/feed/LivePage'
import ReelsPage from './pages/feed/ReelsPage'
import HomePage from './pages/public/HomePage'
import SettingsPage from './pages/account/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={<ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <SearchPage />
        </ProtectedRoute>
      } />
      <Route path="/channel/:username" element={
        <ProtectedRoute>
          <ChannelPage />
        </ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      } />
      <Route path="/feed" element={
        <ProtectedRoute>
          <PrototypePage />
        </ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <PrototypePage />
        </ProtectedRoute>
      } />
      <Route path="/404" element={<NotFound />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="/articles" element={<ProtectedRoute><ArticlesPage /></ProtectedRoute>} />
      <Route path="/live" element={<ProtectedRoute><LivePage /></ProtectedRoute>} />
      <Route path="/reels" element={<ProtectedRoute><ReelsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    </Routes>
  )
}
