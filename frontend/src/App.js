import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout    from './components/layout/Layout';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Laptops   from './pages/Laptops';
import AIInsights from './pages/AIInsights';

// Pages simples inline pour les autres sections
const SimplePage = ({ title, icon }) => (
  <div>
    <h1 style={{ fontSize:'1.8rem', fontWeight:700, color:'#1e293b' }}>{icon} {title}</h1>
    <p style={{ color:'#64748b' }}>Page en cours de développement...</p>
  </div>
);

// Route protégée
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#64748b' }}>Chargement...</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"             element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/laptops"      element={<PrivateRoute><Laptops /></PrivateRoute>} />
          <Route path="/ia"           element={<PrivateRoute><AIInsights /></PrivateRoute>} />
          <Route path="/mouvements"   element={<PrivateRoute><SimplePage title="Mouvements de Stock" icon="📦" /></PrivateRoute>} />
          <Route path="/attributions" element={<PrivateRoute><SimplePage title="Attributions" icon="👤" /></PrivateRoute>} />
          <Route path="/maintenances" element={<PrivateRoute><SimplePage title="Maintenances" icon="🔧" /></PrivateRoute>} />
          <Route path="/alertes"      element={<PrivateRoute><SimplePage title="Alertes" icon="🔔" /></PrivateRoute>} />
          <Route path="*"             element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
