import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { CameraView } from './pages/CameraView';
import { GesturesView } from './pages/GesturesView';
import { AnalyticsView } from './pages/AnalyticsView';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { MobileSync } from './pages/MobileSync';
import { AdminMonitor } from './pages/AdminMonitor';
import { DatasetManagement } from './pages/DatasetManagement';
import { CloudSync } from './pages/CloudSync';
import { About } from './pages/About';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { MobileRemote } from './pages/MobileRemote';
import { useAuth } from './context/AuthContext';
import { WebVisionProvider } from './context/WebVisionContext';
import { VirtualCursor } from './components/VirtualCursor';

function App() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-2xl" />
      </div>
    );
  }

  return (
    <WebVisionProvider>
      <VirtualCursor />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/remote/:token" element={<MobileRemote />} />
        
        <Route path="/dashboard" element={user ? <MainLayout /> : <Navigate to="/auth" />}>
          <Route index element={<Dashboard />} />
          <Route path="camera" element={<CameraView />} />
          <Route path="gestures" element={<GesturesView />} />
          <Route path="analytics" element={<AnalyticsView />} />
          <Route path="mobile-sync" element={<MobileSync />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="cloud-sync" element={<CloudSync />} />
          <Route path="about" element={<About />} />
          
          {/* Admin Only Routes */}
          {role === 'admin' && (
            <>
              <Route path="admin" element={<AdminMonitor />} />
              <Route path="datasets" element={<DatasetManagement />} />
            </>
          )}
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </WebVisionProvider>
  );
}

export default App;
