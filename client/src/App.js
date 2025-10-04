import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Playground } from './pages/Playground';
import { Deployments } from './pages/Deployments';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotFound } from './pages/NotFound';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/" element={<HomePage />} />
                  
                  {/* Protected routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/projects" element={
                    <ProtectedRoute>
                      <Layout>
                        <Projects />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/projects/:id" element={
                    <ProtectedRoute>
                      <Layout>
                        <ProjectDetail />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/playground" element={
                    <ProtectedRoute>
                      <Layout>
                        <Playground />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/deployments" element={
                    <ProtectedRoute>
                      <Layout>
                        <Deployments />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#1a1a1a',
                      color: '#00ff41',
                      border: '1px solid #00ff41',
                      fontFamily: 'JetBrains Mono, monospace',
                    },
                    success: {
                      iconTheme: {
                        primary: '#00ff41',
                        secondary: '#1a1a1a',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#ff0040',
                        secondary: '#1a1a1a',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
