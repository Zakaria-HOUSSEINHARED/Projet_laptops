import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const TYPE_COLORS = {
  FIN_GARANTIE: '#f59e0b',
  SEUIL_STOCK: '#ef4444',
  ANOMALIE: '#8b5cf6'
};

function AlertBadge({ type }) {
  const color = TYPE_COLORS[type] || '#64748b';
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.24rem 0.65rem',
      borderRadius: 999,
      fontSize: '0.75rem',
      fontWeight: 700,
      color,
      background: `${color}20`
    }}>
      {type || 'ALERTE'}
    </span>
  );
}

export default function Alertes() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/alertes');
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les alertes');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markAsRead = async (id) => {
    try {
      setError('');
      setSuccess('');
      await api.put(`/alertes/${id}/lire`);
      setSuccess('Alerte marquee comme lue');
      setAlerts((prev) => prev.map((item) => (
        item.id_alerte === id ? { ...item, est_lue: true } : item
      )));
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de marquer cette alerte comme lue');
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      const type = item.type_alerte || item.type || '';
      const isRead = Boolean(item.est_lue);

      if (typeFilter && type !== typeFilter) return false;
      if (statusFilter === 'LUE' && !isRead) return false;
      if (statusFilter === 'NON_LUE' && isRead) return false;

      if (!search) return true;

      const query = search.toLowerCase();
      const laptopText = `${item.marque || ''} ${item.modele || ''}`.toLowerCase();
      const content = `${item.message || ''} ${type}`.toLowerCase();

      return laptopText.includes(query) || content.includes(query);
    });
  }, [alerts, search, typeFilter, statusFilter]);

  const unreadCount = alerts.filter((item) => !item.est_lue).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Alertes</h1>
          <p style={{ color: '#64748b', margin: '0.3rem 0 0' }}>Notifications systeme (fin de garantie, seuil de stock, anomalies)</p>
        </div>
        <button
          onClick={fetchAlerts}
          type="button"
          style={{ padding: '0.68rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
        >
          Rafraichir
        </button>
      </div>

      {error && <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c' }}>{error}</div>}
      {success && <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px', background: '#dcfce7', color: '#166534' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Total alertes</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#1e293b', marginTop: '0.2rem' }}>{alerts.length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Non lues</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#ef4444', marginTop: '0.2rem' }}>{unreadCount}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Rechercher message ou laptop..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ minWidth: 220, flex: 1, maxWidth: 360, padding: '0.68rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem' }}
        />
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          style={{ minWidth: 180, padding: '0.68rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', background: '#fff' }}
        >
          <option value="">Tous les types</option>
          <option value="FIN_GARANTIE">Fin garantie</option>
          <option value="SEUIL_STOCK">Seuil stock</option>
          <option value="ANOMALIE">Anomalie</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{ minWidth: 180, padding: '0.68rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', background: '#fff' }}
        >
          <option value="">Tous les statuts</option>
          <option value="NON_LUE">Non lue</option>
          <option value="LUE">Lue</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden', padding: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Chargement...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['ID', 'Type', 'Message', 'Laptop', 'Date', 'Statut', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((item, idx) => {
                  const type = item.type_alerte || item.type || 'ALERTE';
                  const date = item.date_creation || item.created_at;
                  const isRead = Boolean(item.est_lue);
                  return (
                    <tr key={item.id_alerte || `${type}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#475569', fontWeight: 700 }}>ALT-{String(item.id_alerte || idx + 1).padStart(3, '0')}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><AlertBadge type={type} /></td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155', maxWidth: 380 }}>{item.message || '-'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 600 }}>{`${item.marque || ''} ${item.modele || ''}`.trim() || '-'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155', fontSize: '0.88rem' }}>{date ? new Date(date).toLocaleString('fr-FR') : '-'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.24rem 0.65rem',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isRead ? '#166534' : '#b91c1c',
                          background: isRead ? '#dcfce7' : '#fee2e2'
                        }}>
                          {isRead ? 'Lue' : 'Non lue'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {!isRead ? (
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id_alerte)}
                            style={{ border: 'none', background: '#1e3a5f', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.7rem', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Marquer lue
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Traitee</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredAlerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>Aucune alerte a afficher</div>
        )}
      </div>
    </div>
  );
}