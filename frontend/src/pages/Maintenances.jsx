import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const PRIORITY_COLORS = {
  CRITIQUE: '#ef4444',
  HAUTE: '#f97316',
  MOYENNE: '#f59e0b',
  FAIBLE: '#22c55e'
};

const STATUS_COLORS = {
  OUVERT: '#3b82f6',
  EN_COURS: '#8b5cf6',
  RESOLU: '#22c55e',
  FERME: '#64748b'
};

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '0.92rem',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.35rem',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: '#334155'
};

function Pill({ color, children }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.24rem 0.65rem',
      borderRadius: 999,
      fontSize: '0.75rem',
      fontWeight: 700,
      background: `${color}20`,
      color
    }}>
      {children}
    </span>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '720px', background: '#fff', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 20px 45px rgba(15,23,42,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>{title}</h2>
          <button onClick={onClose} type="button" style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Maintenances() {
  const [maintenances, setMaintenances] = useState([]);
  const [laptops, setLaptops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [createForm, setCreateForm] = useState({
    id_laptop: '',
    description: '',
    priorite: 'MOYENNE',
    technicien: ''
  });
  const [updateForm, setUpdateForm] = useState({
    statut: 'OUVERT',
    technicien: '',
    date_resolution: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [maintRes, laptopsRes] = await Promise.all([
        api.get('/maintenances'),
        api.get('/laptops')
      ]);
      setMaintenances(Array.isArray(maintRes.data) ? maintRes.data : []);
      setLaptops(Array.isArray(laptopsRes.data) ? laptopsRes.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les maintenances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter((item) => {
      if (statusFilter && item.statut !== statusFilter) return false;
      if (priorityFilter && item.priorite !== priorityFilter) return false;
      if (!search) return true;

      const query = search.toLowerCase();
      const laptopText = `${item.marque || ''} ${item.modele || ''} ${item.numero_serie || ''}`.toLowerCase();
      const text = `${item.description || ''} ${item.technicien || ''}`.toLowerCase();

      return laptopText.includes(query) || text.includes(query);
    });
  }, [maintenances, priorityFilter, search, statusFilter]);

  const availableLaptops = useMemo(() => {
    return laptops.filter((item) => item.statut !== 'ATTRIBUE');
  }, [laptops]);

  const openEditModal = (ticket) => {
    setEditingTicket(ticket);
    setUpdateForm({
      statut: ticket.statut || 'OUVERT',
      technicien: ticket.technicien || '',
      date_resolution: ticket.date_resolution ? String(ticket.date_resolution).slice(0, 10) : ''
    });
    setError('');
    setSuccess('');
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingTicket(null);
    setError('');
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/maintenances', createForm);
      setSuccess('Ticket de maintenance cree avec succes');
      setCreateForm({ id_laptop: '', description: '', priorite: 'MOYENNE', technicien: '' });
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Creation impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingTicket) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      ...updateForm,
      date_resolution: (updateForm.statut === 'RESOLU' || updateForm.statut === 'FERME')
        ? (updateForm.date_resolution || new Date().toISOString().slice(0, 10))
        : null
    };

    try {
      await api.put(`/maintenances/${editingTicket.id_maintenance}`, payload);
      setSuccess('Maintenance mise a jour avec succes');
      setEditingTicket(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Mise a jour impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Maintenances</h1>
          <p style={{ color: '#64748b', margin: '0.3rem 0 0' }}>Tickets associes aux laptops avec priorite, statut et administrateur assigne</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={loadData}
            style={{ padding: '0.68rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
          >
            Rafraichir
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '0.68rem 1rem', borderRadius: '8px', border: 'none', background: '#1e3a5f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            + Nouveau ticket
          </button>
        </div>
      </div>

      {error && <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c' }}>{error}</div>}
      {success && <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px', background: '#dcfce7', color: '#166534' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Tickets ouverts</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#1e293b', marginTop: '0.2rem' }}>{maintenances.filter((item) => item.statut === 'OUVERT' || item.statut === 'EN_COURS').length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Critiques / Hautes</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#1e293b', marginTop: '0.2rem' }}>{maintenances.filter((item) => item.priorite === 'CRITIQUE' || item.priorite === 'HAUTE').length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Tickets resolus</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#1e293b', marginTop: '0.2rem' }}>{maintenances.filter((item) => item.statut === 'RESOLU' || item.statut === 'FERME').length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Rechercher laptop, technicien ou description..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ minWidth: 240, flex: 1, maxWidth: 360, ...inputStyle }}
        />
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={{ minWidth: 180, ...inputStyle }}>
          <option value="">Toutes les priorites</option>
          <option value="CRITIQUE">Critique</option>
          <option value="HAUTE">Haute</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="FAIBLE">Faible</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ minWidth: 180, ...inputStyle }}>
          <option value="">Tous les statuts</option>
          <option value="OUVERT">Ouvert</option>
          <option value="EN_COURS">En cours</option>
          <option value="RESOLU">Resolu</option>
          <option value="FERME">Ferme</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden', padding: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Chargement...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Ticket', 'Laptop', 'Description', 'Priorite', 'Statut', 'Administrateur', 'Creation', 'Actions'].map((header) => (
                    <th key={header} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMaintenances.map((item, idx) => (
                  <tr key={item.id_maintenance} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>MNT-{String(item.id_maintenance).padStart(3, '0')}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{`${item.marque || ''} ${item.modele || ''}`.trim() || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.numero_serie || '-'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', maxWidth: 300 }}>{item.description || '-'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}><Pill color={PRIORITY_COLORS[item.priorite] || '#64748b'}>{item.priorite || '-'}</Pill></td>
                    <td style={{ padding: '0.85rem 1rem' }}><Pill color={STATUS_COLORS[item.statut] || '#64748b'}>{item.statut || '-'}</Pill></td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{item.technicien || 'Non assigne administrateur'}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', fontSize: '0.88rem' }}>{item.created_at ? new Date(item.created_at).toLocaleString('fr-FR') : '-'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', padding: '0.35rem 0.7rem', cursor: 'pointer', color: '#334155' }}
                      >
                        Gerer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredMaintenances.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>Aucun ticket de maintenance trouve</div>
        )}
      </div>

      {showCreateModal && (
        <ModalShell title="Nouveau ticket de maintenance" onClose={closeModals}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Laptop</label>
                <select
                  value={createForm.id_laptop}
                  onChange={(event) => setCreateForm({ ...createForm, id_laptop: event.target.value })}
                  style={inputStyle}
                  required
                >
                  <option value="">Selectionner un laptop</option>
                  {availableLaptops.map((item) => (
                    <option key={item.id_laptop} value={item.id_laptop}>{item.marque} {item.modele} ({item.numero_serie})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priorite</label>
                <select
                  value={createForm.priorite}
                  onChange={(event) => setCreateForm({ ...createForm, priorite: event.target.value })}
                  style={inputStyle}
                >
                  <option value="CRITIQUE">Critique</option>
                  <option value="HAUTE">Haute</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="FAIBLE">Faible</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  required
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Administrateur assigne</label>
                <input
                  value={createForm.technicien}
                  onChange={(event) => setCreateForm({ ...createForm, technicien: event.target.value })}
                  style={inputStyle}
                  placeholder="Nom de l'administrateur"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" onClick={closeModals} style={{ padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={saving} style={{ padding: '0.7rem 1rem', borderRadius: '8px', border: 'none', background: '#1e3a5f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Enregistrement...' : 'Creer le ticket'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {editingTicket && (
        <ModalShell title={`Mettre a jour ${editingTicket.marque || ''} ${editingTicket.modele || ''}`.trim()} onClose={closeModals}>
          <form onSubmit={handleUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Statut</label>
                <select
                  value={updateForm.statut}
                  onChange={(event) => setUpdateForm({ ...updateForm, statut: event.target.value })}
                  style={inputStyle}
                >
                  <option value="OUVERT">Ouvert</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="RESOLU">Resolu</option>
                  <option value="FERME">Ferme</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Administrateur</label>
                <input
                  value={updateForm.technicien}
                  onChange={(event) => setUpdateForm({ ...updateForm, technicien: event.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date de resolution</label>
                <input
                  type="date"
                  value={updateForm.date_resolution}
                  onChange={(event) => setUpdateForm({ ...updateForm, date_resolution: event.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Laptop</label>
                <div style={{ ...inputStyle, background: '#f8fafc', color: '#475569' }}>{editingTicket.marque} {editingTicket.modele} ({editingTicket.numero_serie})</div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '8px', color: '#334155' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.35rem' }}>Description du ticket</div>
              <div>{editingTicket.description || '-'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" onClick={closeModals} style={{ padding: '0.7rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={saving} style={{ padding: '0.7rem 1rem', borderRadius: '8px', border: 'none', background: '#1e3a5f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Mise a jour...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}