import ProfilePage from './pages/ProfilePage'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrototypePage from './pages/PrototypePage'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/layout/ProtectedRoute'
import NotFound from './pages/NotFound'
import SearchPage from './pages/SearchPage'
import ChannelPage from './pages/ChannelPage'
import MessagesPage from './pages/MessagesPage'
import FeedbackPage from './pages/FeedbackPage'
import ArticlesPage from './pages/ArticlesPage'
import LivePage from './pages/LivePage'
import ReelsPage from './pages/ReelsPage'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
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