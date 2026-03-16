import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const statusColors = {
  ENTREE: 'green',
  SORTIE: 'red',
  TRANSFERT: 'blue',
};

const statusLabels = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  TRANSFERT: 'Transfert',
};

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/mouvements');
      setMovements(res.data);
    } catch (err) {
      setMovements([]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return movements.filter((mov) => {
      const matchType = typeFilter ? mov.type === typeFilter : true;
      if (!matchType) return false;

      if (!search) return true;
      const q = search.toLowerCase();
      const laptopText = `${mov.marque || ''} ${mov.modele || ''}`.toLowerCase();
      const userText = String(mov.responsable || '').toLowerCase();

      return laptopText.includes(q) || userText.includes(q);
    });
  }, [movements, search, typeFilter]);

  const badgeStyle = (type) => ({
    display: 'inline-block',
    padding: '0.24rem 0.6rem',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: statusColors[type] || '#64748b',
    background: `${statusColors[type] || '#94a3b8'}20`,
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Mouvements de Stock</h1>
          <p style={{ color: '#64748b', margin: '0.3rem 0 0' }}>Suivi des entrees, sorties et transferts</p>
        </div>
        <button
          onClick={fetchMovements}
          style={{ padding: '0.68rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
        >
          Rafraichir
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 230, flex: 1, maxWidth: 320, padding: '0.65rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem' }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ minWidth: 170, padding: '0.65rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.92rem' }}
        >
          <option value="">Tous les types</option>
          <option value="ENTREE">Entree</option>
          <option value="SORTIE">Sortie</option>
          <option value="TRANSFERT">Transfert</option>
        </select>
        <button
          type="button"
          style={{ padding: '0.68rem 1rem', borderRadius: '8px', border: 'none', background: '#1e3a5f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          + Ajouter Mouvement
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden', padding: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Chargement...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Date', 'Type', 'Ordinateur', 'Utilisateur', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((mov, idx) => (
                  <tr key={mov.id_mouvement || `${mov.type}-${mov.created_at}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', fontSize: '0.88rem' }}>{mov.created_at ? new Date(mov.created_at).toLocaleString('fr-FR') : '-'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={badgeStyle(mov.type)}>{statusLabels[mov.type] || mov.type || '-'}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 600 }}>{`${mov.marque || ''} ${mov.modele || ''}`.trim() || '-'}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{mov.responsable || '-'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button type="button" style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', color: '#334155' }}>
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>Aucun mouvement trouve</div>
        )}
      </div>
    </div>
  );
}
