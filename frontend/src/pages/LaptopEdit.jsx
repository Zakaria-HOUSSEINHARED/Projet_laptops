import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LaptopEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/laptops/${id}`)
      .then(r => setForm(r.data))
      .catch(() => setError('Laptop not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/laptops/${id}`, form);
      navigate(`/laptops/${id}`);
    } catch (err) {
      setError('Update failed');
    }
  };

  if (loading) return <div style={{padding:'2rem'}}>Loading...</div>;
  if (error) return <div style={{padding:'2rem', color:'#dc2626'}}>{error}</div>;
  if (!form) return null;

  return (
    <div style={{maxWidth:600, margin:'2rem auto', background:'#fff', borderRadius:12, boxShadow:'0 1px 8px rgba(0,0,0,0.07)', padding:'2rem'}}>
      <h2 style={{marginBottom:'1.5rem', color:'#1e293b'}}>Edit Laptop</h2>
      <form onSubmit={handleSubmit}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
          {[['marque','Brand'],['modele','Model'],['numero_serie','Serial Number'],['processeur','Processor'],['ram','RAM (GB)'],['stockage','Storage']].map(([k, l]) => (
            <div key={k}>
              <label style={{fontWeight:600}}>{l}</label>
              <input value={form[k] || ''} onChange={e => setForm({...form, [k]: e.target.value})} style={{width:'100%', padding:'0.5rem', borderRadius:6, border:'1px solid #d1d5db'}} />
            </div>
          ))}
          <div>
            <label style={{fontWeight:600}}>Condition</label>
            <select value={form.etat || ''} onChange={e => setForm({...form, etat: e.target.value})} style={{width:'100%', padding:'0.5rem', borderRadius:6, border:'1px solid #d1d5db'}}>
              <option value="NEUF">New</option>
              <option value="BON_ETAT">Good</option>
              <option value="DEGRADE">Degraded</option>
              <option value="HORS_SERVICE">Out of order</option>
            </select>
          </div>
          <div>
            <label style={{fontWeight:600}}>Purchase Date</label>
            <input type="date" value={form.date_achat ? form.date_achat.slice(0,10) : ''} onChange={e => setForm({...form, date_achat: e.target.value})} style={{width:'100%', padding:'0.5rem', borderRadius:6, border:'1px solid #d1d5db'}} />
          </div>
        </div>
        {error && <div style={{color:'#dc2626', marginTop:'1rem'}}>{error}</div>}
        <div style={{marginTop:'2rem', display:'flex', gap:'1rem'}}>
          <button type="submit" style={{flex:1, background:'#1e3a5f', color:'#fff', border:'none', borderRadius:8, padding:'0.7rem 1.5rem', fontWeight:600, cursor:'pointer'}}>Save</button>
          <button type="button" onClick={() => navigate(-1)} style={{flex:1, background:'#f1f5f9', color:'#374151', border:'none', borderRadius:8, padding:'0.7rem 1.5rem', fontWeight:600, cursor:'pointer'}}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
