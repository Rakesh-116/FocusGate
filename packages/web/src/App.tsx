import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import BlockScreenPreview from './pages/BlockScreenPreview'
import BlockedPage from './pages/BlockedPage'
import VisionCards from './pages/VisionCards'
import { ProtectedRoute } from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'

const queryClient = new QueryClient()

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/blocked"
              element={
                <ProtectedRoute>
                  <BlockedPage />
                </ProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/vision-cards" element={<VisionCards />} />
              <Route path="/preview-block" element={<BlockScreenPreview />} />
            </Route>
            <Route path="/block-preview" element={<Navigate to="/preview-block" replace />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

export default App
