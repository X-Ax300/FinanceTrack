import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy load all heavy pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Salary = lazy(() => import('./pages/Salary'));
const Cards = lazy(() => import('./pages/Cards'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Savings = lazy(() => import('./pages/Savings'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Reports = lazy(() => import('./pages/Reports'));
const Friends = lazy(() => import('./pages/Friends'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading component for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading page...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return !currentUser ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { loading } = useAuth();
  
  if (loading) {
    return <SplashScreen />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/salary" element={<Salary />} />
                  <Route path="/cards" element={<Cards />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/savings" element={<Savings />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Suspense>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
