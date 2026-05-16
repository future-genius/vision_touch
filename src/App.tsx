import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { MobileSync } from './pages/MobileSync';
import { AdminMonitor } from './pages/AdminMonitor';
import { DatasetManagement } from './pages/DatasetManagement';
import { Login } from './pages/Login';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      
      <Route path="/" element={user ? <MainLayout /> : <Navigate to="/login" />}>
        <Route index element={<Dashboard />} />
        <Route path="camera" element={<Dashboard />} />
        <Route path="gestures" element={<Dashboard />} />
        <Route path="analytics" element={<Dashboard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="mobile-sync" element={<MobileSync />} />
        
        {/* Admin Only Routes */}
        {role === 'admin' && (
          <>
            <Route path="admin" element={<AdminMonitor />} />
            <Route path="datasets" element={<DatasetManagement />} />
          </>
        )}
        
        <Route path="cloud-sync" element={<Dashboard />} />
        <Route path="about" element={<Dashboard />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
