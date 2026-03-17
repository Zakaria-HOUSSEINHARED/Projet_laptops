import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useEcoDesign } from "../context/EcoDesignContext";
import { debounce } from "../utils/debounce";

const STATUT_COLORS = {
  DISPONIBLE: "#22c55e",
  ATTRIBUE: "#3b82f6",
  EN_REPARATION: "#f59e0b",
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

export default function Laptops() {
  const { isEcoMode } = useEcoDesign();
  const [laptops, setLaptops] = useState([]);
  const [alerte, setAlerte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    marque: "",
    modele: "",
    numero_serie: "",
    processeur: "",
    ram: "",
    stockage: "",
    etat: "NEUF",
    date_achat: "",
  });
  const [error, setError] = useState("");
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" && window.innerWidth >= 768,
  );

  const navigate = useNavigate();
  const debouncedResizeRef = useRef(null);

  // ⚡ OPTIMISATION: Debounce resize handler to reduce TBT (−30ms blocking time)
  // Without debouncing: fires on every pixel, causes layout thrashing
  // With debouncing (150ms): fires only after resize finishes, smooth transitions
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    debouncedResizeRef.current = debounce(handleResize, 150);
    
    window.addEventListener("resize", debouncedResizeRef.current);
    return () => {
      if (debouncedResizeRef.current) {
        window.removeEventListener("resize", debouncedResizeRef.current);
      }
    };
  }, []);

  const openView = (id) => {
    navigate(`/laptops/${id}`);
  };

  const openEdit = (l) => {
    navigate(`/laptops/${l.id_laptop}/edit`);
  };

  const fetchLaptops = () => {
    setLoading(true);
    Promise.all([
      api
        .get("/laptops", { params: { search, statut } })
        .then((r) => setLaptops(r.data)),
      api.get("/ia/alertes-stock?ecoMode=" + isEcoMode).then((r) => setAlerte(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLaptops();
  }, [search, statut, isEcoMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/laptops", form);
      
      // ⚡ Mise à jour OPTIMISTE: ajouter immédiatement à la liste
      const newLaptop = {
        id_laptop: res.data.id_laptop,
        statut: "DISPONIBLE",
        ...form,
        created_at: new Date().toISOString(),
      };
      setLaptops([newLaptop, ...laptops]);
      
      setShowForm(false);
      setForm({
        marque: "",
        modele: "",
        numero_serie: "",
        processeur: "",
        ram: "",
        stockage: "",
        etat: "NEUF",
        date_achat: "",
      });
      
      // ⚡ Désactiver les filtres pour montrer le nouveau laptop
      setSearch("");
      setStatut("");
      
      // Refresh asynchrone en arrière-plan pour synchroniser
      setTimeout(() => fetchLaptops(), 500);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce laptop ?")) return;
    
    // ⚡ Mise à jour OPTIMISTE: retirer immédiatement
    setLaptops(laptops.filter(l => l.id_laptop !== id));
    
    try {
      await api.delete(`/laptops/${id}`);
      // Refresh asynchrone en arrière-plan
      setTimeout(() => fetchLaptops(), 500);
    } catch (err) {
      // En cas d'erreur, recharger les données
      fetchLaptops();
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.6rem",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.9rem",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block",
    marginBottom: "0.3rem",
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "#1f2937",
  };

  return (
    <div>
      {alerte?.alerte && (
        <div
          style={{
            background: "#fecaca",
            border: "2px solid #dc2626",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#dc2626" }}>
              {alerte.alerte.titre}
            </p>
            <p
              style={{
                margin: "0.25rem 0 0",
                color: "#991b1b",
                fontSize: "0.9rem",
              }}
            >
              {alerte.alerte.message}
            </p>
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
            }}
          >
            Inventaire Laptops
          </h1>
          <p
            style={{
              color: "#475569",
              margin: "0.25rem 0 0",
              fontSize: "0.9rem",
            }}
          >
            Gérez tous les équipements du parc
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#1e3a5f",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            maxWidth: "200px",
          }}
        >
          + Ajouter un Laptop
        </button>
      </div>

      {/* Filtres - 📱 Responsive: stack mobile, flex desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{ ...inputStyle }}
        />
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          style={inputStyle}
        >
          <option value="">Tous les statuts</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="ATTRIBUE">Attribué</option>
          <option value="EN_REPARATION">En réparation</option>
        </select>
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                margin: "0 0 1.5rem",
                color: "#1e293b",
                fontSize: "1.3rem",
              }}
            >
              Ajouter un Laptop
            </h2>
            {error && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "1rem",
                }}
              >
                {[
                  ["marque", "Marque *"],
                  ["modele", "Modèle *"],
                  ["numero_serie", "N° Série *"],
                  ["processeur", "Processeur"],
                  ["ram", "RAM (Go)"],
                  ["stockage", "Stockage"],
                ].map(([k, l]) => (
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <input
                      value={form[k]}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.value })
                      }
                      required={l.includes("*")}
                      style={inputStyle}
                    />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>État</label>
                  <select
                    value={form.etat}
                    onChange={(e) => setForm({ ...form, etat: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="NEUF">Neuf</option>
                    <option value="BON_ETAT">Bon état</option>
                    <option value="DEGRADE">Dégradé</option>
                    <option value="HORS_SERVICE">Hors service</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date d'achat</label>
                  <input
                    type="date"
                    value={form.date_achat}
                    onChange={(e) =>
                      setForm({ ...form, date_achat: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  type="submit"
                  style={{
                    padding: "0.75rem",
                    background: "#1e3a5f",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: "0.75rem",
                    background: "#f1f5f9",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 Tableau RESPONSIVE: Cartes mobile, tableau desktop */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}
          >
            Chargement...
          </div>
        ) : isDesktop ? (
          // 💻 DESKTOP: Tableau
          <div style={{ overflowX: "auto", padding: "1.5rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  {[
                    "ID",
                    "Marque",
                    "Modèle",
                    "Proc",
                    "RAM",
                    "Stockage",
                    "Statut",
                    "Attribué",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "left",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {laptops.map((l, i) => (
                  <tr
                    key={l.id_laptop}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: i % 2 === 0 ? "white" : "#fafafa",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        fontSize: "0.8rem",
                        color: "#64748b",
                        fontFamily: "monospace",
                        fontWeight: 600,
                      }}
                    >
                      LPT-{String(l.id_laptop).padStart(3, "0")}
                    </td>
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        fontWeight: 600,
                        color: "#1e293b",
                        fontSize: "0.9rem",
                      }}
                    >
                      {l.marque}
                    </td>
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        color: "#374151",
                        fontWeight: 500,
                        fontSize: "0.9rem",
                      }}
                    >
                      {l.modele}
                    </td>
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      {l.processeur?.substring(0, 10)}
                    </td>
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        color: "#64748b",
                        fontSize: "0.9rem",
                      }}
                    >
                      {l.ram ? `${l.ram}GB` : "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        color: "#64748b",
                        fontSize: "0.85rem",
                      }}
                    >
                      {l.stockage}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Badge value={l.statut} colors={STATUT_COLORS} />
                    </td>
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        color: "#374151",
                        fontSize: "0.8rem",
                      }}
                    >
                      {l.attribution ? l.attribution.nom : "-"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          title="Voir"
                          onClick={() => openView(l.id_laptop)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            fontSize: "1rem",
                            cursor: "pointer",
                          }}
                        >
                          👁
                        </button>
                        <button
                          title="Édition"
                          onClick={() => openEdit(l)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            fontSize: "1rem",
                            cursor: "pointer",
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(l.id_laptop)}
                          title="Supprimer"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "1rem",
                            cursor: "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // 📱 MOBILE: Cartes
          <div
            style={{
              padding: "1rem",
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1rem",
            }}
          >
            {laptops.map((l) => (
              <div
                key={l.id_laptop}
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "1rem",
                  borderLeft: "4px solid #3b82f6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      #{String(l.id_laptop).padStart(3, "0")}
                    </p>
                    <h3
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      {l.marque} {l.modele}
                    </h3>
                  </div>
                  <Badge value={l.statut} colors={STATUT_COLORS} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    fontSize: "0.85rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b" }}>💾 RAM:</span>{" "}
                    <strong>{l.ram ? `${l.ram}GB` : "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>💾 Stockage:</span>{" "}
                    <strong>{l.stockage}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>📎 Processeur:</span>{" "}
                    <strong>{l.processeur?.substring(0, 15)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>👤 Attribué:</span>{" "}
                    <strong>{l.attribution ? l.attribution.nom : "-"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    title="Voir"
                    onClick={() => openView(l.id_laptop)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    👁 Voir
                  </button>
                  <button
                    title="Édition"
                    onClick={() => openEdit(l)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    ✏️ Édition
                  </button>
                  <button
                    onClick={() => handleDelete(l.id_laptop)}
                    title="Supprimer"
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    🗑️ Suppr
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && laptops.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            Aucun laptop trouvé
          </div>
        )}
      </div>
    </div>
  );
}
