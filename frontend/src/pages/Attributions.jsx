import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Attributions() {
  const [form, setForm] = useState({
    user: "",
    laptop: "",
    startDate: "",
    endDate: ""
  });
  const [users, setUsers] = useState([]);
  const [laptops, setLaptops] = useState([]);
  const [attributions, setAttributions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger utilisateurs et laptops disponibles
  useEffect(() => {
    async function fetchData() {
      const usersRes = await api.get("/utilisateurs");
      const laptopsRes = await api.get("/laptops?statut=DISPONIBLE");
      const attrRes = await api.get("/attributions");
      setUsers(usersRes.data);
      setLaptops(laptopsRes.data);
      setAttributions(attrRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post("/attributions", {
      id_laptop: form.laptop,
      id_utilisateur: form.user,
      date_attribution: form.startDate,
      date_retour: form.endDate
    });
    // Rafraîchir la liste
    const attrRes = await api.get("/attributions");
    setAttributions(attrRes.data);
  };

  if (loading) return <div>Chargement...</div>;

  // Badge stylisé pour le statut
  const STATUT_COLORS = {
    ACTIVE: "#3b82f6",
    CLOTUREE: "#22c55e",
    EN_ATTENTE: "#f59e0b",
  };
  const Badge = ({ value, colors }) => (
    <span
      style={{
        padding: "0.25rem 0.6rem",
        borderRadius: "20px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: (colors[value] || "#94a3b8") + "20",
        color: colors[value] || "#64748b",
      }}
    >
      {value}
    </span>
  );

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <h1 style={{ color: "#1e293b", fontSize: "2rem", fontWeight: 700 }}>Attributions</h1>
      <p style={{ color: "#64748b", fontSize: "1.1rem" }}>Affectation d’un laptop à un utilisateur pour une période donnée</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "#f8fafc", padding: "2rem", borderRadius: "12px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <select value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} required style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #d1d5db" }}>
            <option value="">Sélectionner un utilisateur</option>
            {users.map(u => (
              <option key={u.id_utilisateur} value={u.id_utilisateur}>
                {u.nom} {u.prenom} ({u.email})
              </option>
            ))}
          </select>
          <select value={form.laptop} onChange={e => setForm({ ...form, laptop: e.target.value })} required style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #d1d5db" }}>
            <option value="">Sélectionner un laptop</option>
            {laptops.map(l => (
              <option key={l.id_laptop} value={l.id_laptop}>
                {l.marque} {l.modele} ({l.numero_serie})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <input
            type="date"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
            required
            style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
          <input
            type="date"
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value })}
            required
            style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </div>
        <button type="submit" style={{ background: "#2563eb", color: "white", padding: "0.7rem", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "1rem", marginTop: "1rem" }}>Attribuer</button>
      </form>
      <hr style={{ margin: "2rem 0" }} />
      <h2 style={{ color: "#1e293b", fontSize: "1.3rem", fontWeight: 700 }}>Liste des attributions</h2>
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", overflow: "hidden", padding: "1.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Utilisateur</th>
              <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Laptop</th>
              <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Période</th>
              <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {attributions.map((attr, i) => (
              <tr key={attr.id_attribution} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>
                  {attr.nom} {attr.prenom} <span style={{ color: "#64748b", fontSize: "0.8rem" }}>({attr.email})</span>
                </td>
                <td style={{ padding: "0.85rem 1rem", color: "#374151", fontWeight: 500, fontSize: "0.9rem" }}>
                  {attr.marque} {attr.modele} <span style={{ color: "#64748b", fontSize: "0.8rem" }}>({attr.numero_serie})</span>
                </td>
                <td style={{ padding: "0.85rem 1rem", color: "#64748b", fontSize: "0.9rem" }}>
                  {attr.date_attribution} - {attr.date_retour || <span style={{ color: "#3b82f6" }}>En cours</span>}
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <Badge value={attr.statut} colors={STATUT_COLORS} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
