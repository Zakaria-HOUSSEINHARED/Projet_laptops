import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/',              icon: '📊', label: 'Dashboard' },
  { path: '/laptops',       icon: '💻', label: 'Laptops' },
  { path: '/mouvements',    icon: '📦', label: 'Mouvements' },
  { path: '/attributions',  icon: '👤', label: 'Attributions' },
  { path: '/maintenances',  icon: '🔧', label: 'Maintenance' },
  { path: '/ia',            icon: '🤖', label: 'AI Insights' },
  { path: '/alertes',       icon: '🔔', label: 'Alertes' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'Inter, sans-serif', background:'#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? '64px' : '240px', transition:'width 0.2s',
        background:'#1e3a5f', color:'white', display:'flex', flexDirection:'column',
        position:'fixed', height:'100vh', zIndex:100
      }}>
        {/* Logo */}
        <div style={{ padding:'1.5rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <span style={{ fontSize:'1.5rem' }}>💻</span>
          {!collapsed && <span style={{ fontWeight:700, fontSize:'1rem' }}>LaptopStock</span>}
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ marginLeft:'auto', background:'none', border:'none', color:'white', cursor:'pointer', fontSize:'1.2rem' }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, padding:'1rem 0.5rem', overflowY:'auto' }}>
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              style={{
                display:'flex', alignItems:'center', gap:'0.75rem',
                padding:'0.75rem 0.75rem', borderRadius:'8px', marginBottom:'0.25rem',
                textDecoration:'none', color:'white', fontSize:'0.9rem', fontWeight:500,
                background: location.pathname === item.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition:'background 0.15s'
              }}>
              <span style={{ fontSize:'1.1rem', minWidth:'20px', textAlign:'center' }}>{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding:'1rem', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
          {!collapsed && (
            <div style={{ marginBottom:'0.5rem', fontSize:'0.8rem', opacity:0.8 }}>
              <div style={{ fontWeight:600 }}>{user?.prenom} {user?.nom}</div>
              <div style={{ opacity:0.7 }}>{user?.role}</div>
            </div>
          )}
          <button onClick={handleLogout}
            style={{ width:'100%', padding:'0.5rem', background:'rgba(255,255,255,0.1)', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'0.85rem' }}>
            {collapsed ? '🚪' : '🚪 Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: collapsed ? '64px' : '240px', flex:1, transition:'margin-left 0.2s', padding:'2rem', minHeight:'100vh' }}>
        {children}
      </main>
    </div>
  );
}
