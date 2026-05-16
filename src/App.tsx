import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { MobileSync } from './pages/MobileSync';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="camera" element={<Dashboard />} />
        <Route path="gestures" element={<Dashboard />} />
        <Route path="analytics" element={<Dashboard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="mobile-sync" element={<MobileSync />} />
        <Route path="cloud-sync" element={<Dashboard />} />
        <Route path="about" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
