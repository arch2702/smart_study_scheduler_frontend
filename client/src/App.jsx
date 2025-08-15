import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import SubjectDetails from './pages/SubjectDetails';
import Notes from './pages/Notes';
import UploadSummary from './pages/UploadSummary';
import Rewards from './pages/Rewards';
import Settings from './pages/Settings';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <>
                        <Header />
                        <Dashboard />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subjects"
                  element={
                    <ProtectedRoute>
                      <>
                        <Header />
                        <Subjects />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subjects/:id"
                  element={
                    <ProtectedRoute>
                      <>
                        <Header />
                        <SubjectDetails />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notes"
                  element={
                    <ProtectedRoute>
                      <>
                        <Header />
                        <Notes />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload-summary"
                  element={
                    <ProtectedRoute>
                      <>
                        <Header />
                        <UploadSummary />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rewards"
                  element={
                    <ProtectedRoute>
                      <>
                        <Header />
                        <Rewards />
                      </>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <>
                        <Header />
                        <Settings />
                      </>
                    </ProtectedRoute>
                  }
                />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
