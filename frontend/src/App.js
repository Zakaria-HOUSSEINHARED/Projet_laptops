import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout    from './components/layout/Layout';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Laptops   from './pages/Laptops';
import AIInsights from './pages/AIInsights';
import LaptopView from './pages/LaptopView';
import LaptopEdit from './pages/LaptopEdit';
import StockMovements from './pages/StockMovements';
import Maintenances from './pages/Maintenances';
import Alertes from './pages/Alertes';
import Attributions from './pages/Attributions';

// Pages simples inline pour les autres sections
const SimplePage = ({ title, icon }) => (
  <div>
    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>
      {icon} {title}
    </h1>
    <p style={{ color: '#64748b' }}>Page en cours de développement...</p>
  </div>
);


// Route protégée simple (sans lazy loading)
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#64748b',
        }}
      >
        Chargement...
      </div>
    );
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/laptops" element={<PrivateRoute><Laptops /></PrivateRoute>} />
          <Route path="/laptops/:id" element={<PrivateRoute><LaptopView /></PrivateRoute>} />
          <Route path="/laptops/:id/edit" element={<PrivateRoute><LaptopEdit /></PrivateRoute>} />
          <Route path="/ia" element={<PrivateRoute><AIInsights /></PrivateRoute>} />
          <Route path="/mouvements" element={<PrivateRoute><StockMovements /></PrivateRoute>} />
          <Route path="/attributions" element={<PrivateRoute><Attributions /></PrivateRoute>} />
          <Route path="/maintenances" element={<PrivateRoute><Maintenances /></PrivateRoute>} />
          <Route path="/alertes" element={<PrivateRoute><Alertes /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
