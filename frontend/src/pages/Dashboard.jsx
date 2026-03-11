import { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import api from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={{ background:'white', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', borderLeft:`4px solid ${color}` }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div>
        <p style={{ color:'#64748b', fontSize:'0.85rem', margin:0 }}>{label}</p>
        <p style={{ fontSize:'2rem', fontWeight:700, color:'#1e293b', margin:'0.25rem 0 0' }}>{value}</p>
        {sub && <p style={{ color:'#94a3b8', fontSize:'0.75rem', margin:0 }}>{sub}</p>}
      </div>
      <span style={{ fontSize:'2rem' }}>{icon}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/laptops/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'#64748b' }}>Chargement...</div>;
  if (!stats)  return <div style={{ textAlign:'center', padding:'4rem', color:'#ef4444' }}>Erreur de chargement</div>;

  const doughnutData = {
    labels: ['Disponibles', 'Attribués', 'En maintenance'],
    datasets: [{
      data: [stats.disponibles, stats.attribues, stats.maintenance],
      backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b'],
      borderWidth: 0
    }]
  };

  const barData = {
    labels: (stats.parMarque || []).map(m => m.marque),
    datasets: [{
      label: 'Laptops par marque',
      data:  (stats.parMarque || []).map(m => m.nb),
      backgroundColor: '#3b82f6',
      borderRadius: 6
    }]
  };

  return (
    <div>
      <h1 style={{ fontSize:'1.8rem', fontWeight:700, color:'#1e293b', marginBottom:'0.5rem' }}>Dashboard</h1>
      <p style={{ color:'#64748b', marginBottom:'2rem' }}>Vue d'ensemble du parc informatique</p>

      {/* Stats cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem', marginBottom:'2rem' }}>
        <StatCard icon="💻" label="Total Laptops"    value={stats.total}        color="#6366f1" sub="dans le système" />
        <StatCard icon="✅" label="Disponibles"      value={stats.disponibles}  color="#22c55e" sub={`${Math.round(stats.disponibles/stats.total*100)}% du total`} />
        <StatCard icon="👤" label="Attribués"        value={stats.attribues}    color="#3b82f6" sub={`${Math.round(stats.attribues/stats.total*100)}% du total`} />
        <StatCard icon="🔧" label="En maintenance"   value={stats.maintenance}  color="#f59e0b" sub={`${Math.round(stats.maintenance/stats.total*100)}% du total`} />
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'1.5rem' }}>
        <div style={{ background:'white', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin:'0 0 1rem', color:'#1e293b' }}>Répartition par statut</h3>
          <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div style={{ background:'white', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin:'0 0 1rem', color:'#1e293b' }}>Laptops par marque</h3>
          <Bar data={barData} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>
    </div>
  );
}
