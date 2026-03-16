import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const STATUT_COLORS = { DISPONIBLE:'#22c55e', ATTRIBUE:'#3b82f6', EN_REPARATION:'#f59e0b' };

const Badge = ({ value, colors }) => (
  <span style={{ padding:'0.25rem 0.6rem', borderRadius:'20px', fontSize:'0.75rem', fontWeight:600,
    background: (colors[value] || '#94a3b8') + '20', color: colors[value] || '#64748b' }}>
    {value}
  </span>
);

export default function Laptops() {
  const [laptops,  setLaptops]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statut,   setStatut]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ marque:'', modele:'', numero_serie:'', processeur:'', ram:'', stockage:'', etat:'NEUF', date_achat:'' });
  const [error,    setError]    = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);

  const navigate = useNavigate();

  const openView = (id) => {
    navigate(`/laptops/${id}`);
  };

  const openEdit = (l) => {
    navigate(`/laptops/${l.id_laptop}/edit`);
  };

  const fetchLaptops = () => {
    setLoading(true);
    api.get('/laptops', { params: { search, statut } })
      .then(r => setLaptops(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLaptops(); }, [search, statut]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/laptops', form);
      setShowForm(false);
      setForm({ marque:'', modele:'', numero_serie:'', processeur:'', ram:'', stockage:'', etat:'NEUF', date_achat:'' });
      fetchLaptops();
    } catch (err) { setError(err.response?.data?.message || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce laptop ?')) return;
    await api.delete(`/laptops/${id}`);
    fetchLaptops();
  };

  const inputStyle = { width:'100%', padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:'6px', fontSize:'0.9rem', boxSizing:'border-box' };
  const labelStyle = { display:'block', marginBottom:'0.3rem', fontWeight:600, fontSize:'0.85rem', color:'#374151' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:'1.8rem', fontWeight:700, color:'#1e293b', margin:0 }}>Inventaire Laptops</h1>
          <p style={{ color:'#64748b', margin:'0.25rem 0 0' }}>Gérez tous les équipements du parc</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ padding:'0.75rem 1.5rem', background:'#1e3a5f', color:'white', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
          + Ajouter un Laptop
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..."
          style={{ ...inputStyle, maxWidth:'300px' }} />
        <select value={statut} onChange={e => setStatut(e.target.value)} style={{ ...inputStyle, maxWidth:'180px' }}>
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="ATTRIBUE">Attribué</option>
          <option value="EN_REPARATION">En réparation</option>
        </select>
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'12px', padding:'2rem', width:'560px', maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ margin:'0 0 1.5rem', color:'#1e293b' }}>Ajouter un Laptop</h2>
            {error && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'0.75rem', borderRadius:'6px', marginBottom:'1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                {[['marque','Marque *'],['modele','Modèle *'],['numero_serie','N° Série *'],['processeur','Processeur'],['ram','RAM (Go)'],['stockage','Stockage']].map(([k, l]) => (
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <input value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})}
                      required={l.includes('*')} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>État</label>
                  <select value={form.etat} onChange={e => setForm({...form, etat: e.target.value})} style={inputStyle}>
                    <option value="NEUF">Neuf</option>
                    <option value="BON_ETAT">Bon état</option>
                    <option value="DEGRADE">Dégradé</option>
                    <option value="HORS_SERVICE">Hors service</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date d'achat</label>
                  <input type="date" value={form.date_achat} onChange={e => setForm({...form, date_achat: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem' }}>
                <button type="submit" style={{ flex:1, padding:'0.75rem', background:'#1e3a5f', color:'white', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                  Enregistrer
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex:1, padding:'0.75rem', background:'#f1f5f9', color:'#374151', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div style={{ background:'white', borderRadius:'12px', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', overflow:'hidden', padding:'1.5rem' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#64748b' }}>Loading...</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {['ID','Brand','Model','Processor','RAM','Storage','Status','Assigned To','Actions'].map(h => (
                  <th key={h} style={{ padding:'0.85rem 1rem', textAlign:'left', fontSize:'0.8rem', fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laptops.map((l, i) => (
                <tr key={l.id_laptop} style={{ borderBottom:'1px solid #f1f5f9', background: i%2===0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding:'0.85rem 1rem', fontSize:'0.85rem', color:'#64748b', fontFamily:'monospace', fontWeight:600 }}>LPT-{String(l.id_laptop).padStart(3,'0')}</td>
                  <td style={{ padding:'0.85rem 1rem', fontWeight:600, color:'#1e293b' }}>{l.marque}</td>
                  <td style={{ padding:'0.85rem 1rem', color:'#374151', fontWeight:500 }}>{l.modele}</td>
                  <td style={{ padding:'0.85rem 1rem', color:'#64748b', fontSize:'0.85rem' }}>{l.processeur}</td>
                  <td style={{ padding:'0.85rem 1rem', color:'#64748b' }}>{l.ram ? `${l.ram}GB` : '—'}</td>
                  <td style={{ padding:'0.85rem 1rem', color:'#64748b', fontSize:'0.85rem' }}>{l.stockage}</td>
                  <td style={{ padding:'0.85rem 1rem' }}>
                    <Badge value={l.statut} colors={STATUT_COLORS} />
                  </td>
                  <td style={{ padding:'0.85rem 1rem', color:'#374151', fontSize:'0.85rem' }}>
                    {l.attribution ? l.attribution.nom : '-'}
                  </td>
                  <td style={{ padding:'0.85rem 1rem' }}>
                    <div style={{ display:'flex', gap:'0.15rem' }}>
                      <button title="View" onClick={() => openView(l.id_laptop)} style={{ background:'none', border:'none', color:'#64748b', fontSize:'1.1rem', cursor:'pointer', padding:'0.2rem' }}>👁</button>
                      <button title="Edit" onClick={() => openEdit(l)} style={{ background:'none', border:'none', color:'#64748b', fontSize:'1.1rem', cursor:'pointer', padding:'0.2rem' }}>✏️</button>
                      <button onClick={() => handleDelete(l.id_laptop)} title="Delete" style={{ background:'none', border:'none', color:'#ef4444', fontSize:'1.1rem', cursor:'pointer', padding:'0.2rem' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && laptops.length === 0 && (
          <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8', fontSize:'0.9rem' }}>No laptops found</div>
        )}
      </div>
    </div>
  );
}
