import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonitorDetailPage from './pages/MonitorDetailPage';
import IncidentsPage from './pages/IncidentsPage';
import AlertsPage from './pages/AlertsPage';
import StatusPage from './pages/StatusPage';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/status/:slug" element={<StatusPage />} />
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="monitors/:id" element={<MonitorDetailPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
