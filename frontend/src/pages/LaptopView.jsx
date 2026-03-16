import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LaptopView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [laptop, setLaptop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/laptops/${id}`)
      .then(r => setLaptop(r.data))
      .catch(() => setError('Laptop not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{padding:'2rem'}}>Loading...</div>;
  if (error) return <div style={{padding:'2rem', color:'#dc2626'}}>{error}</div>;
  if (!laptop) return null;

  return (
    <div style={{maxWidth:600, margin:'2rem auto', background:'#fff', borderRadius:12, boxShadow:'0 1px 8px rgba(0,0,0,0.07)', padding:'2rem'}}>
      <h2 style={{marginBottom:'1.5rem', color:'#1e293b'}}>Laptop Details</h2>
      <table style={{width:'100%', fontSize:'1rem'}}>
        <tbody>
          <tr><td style={{fontWeight:600}}>ID</td><td>LPT-{String(laptop.id_laptop).padStart(3,'0')}</td></tr>
          <tr><td style={{fontWeight:600}}>Brand</td><td>{laptop.marque}</td></tr>
          <tr><td style={{fontWeight:600}}>Model</td><td>{laptop.modele}</td></tr>
          <tr><td style={{fontWeight:600}}>Serial Number</td><td>{laptop.numero_serie}</td></tr>
          <tr><td style={{fontWeight:600}}>Processor</td><td>{laptop.processeur}</td></tr>
          <tr><td style={{fontWeight:600}}>RAM</td><td>{laptop.ram} GB</td></tr>
          <tr><td style={{fontWeight:600}}>Storage</td><td>{laptop.stockage}</td></tr>
          <tr><td style={{fontWeight:600}}>Status</td><td>{laptop.statut}</td></tr>
          <tr><td style={{fontWeight:600}}>Condition</td><td>{laptop.etat}</td></tr>
          <tr><td style={{fontWeight:600}}>Purchase Date</td><td>{laptop.date_achat ? new Date(laptop.date_achat).toLocaleDateString() : '-'}</td></tr>
        </tbody>
      </table>
      <button onClick={() => navigate(-1)} style={{marginTop:'2rem', background:'#1e3a5f', color:'#fff', border:'none', borderRadius:8, padding:'0.7rem 1.5rem', fontWeight:600, cursor:'pointer'}}>Back</button>
    </div>
  );
}
