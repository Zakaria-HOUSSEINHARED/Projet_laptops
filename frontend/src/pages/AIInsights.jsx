import { useState } from "react";
import api from "../services/api";
import { useEcoDesign } from "../context/EcoDesignContext";

export default function AIInsights() {
  const { isEcoMode } = useEcoDesign();
  const [demande, setDemande] = useState("");
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [descPanne, setDescPanne] = useState("");
  const [diagnostic, setDiagnostic] = useState(null);
  const [diagLoad, setDiagLoad] = useState(false);
  const [activeTab, setActiveTab] = useState("rapport");

  // Convertir les objets en strings de manière sûre
  const toString = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      if (Array.isArray(val)) return val.join(", ");
      return JSON.stringify(val);
    }
    return String(val);
  };

  const genererRapport = async () => {
    if (!demande.trim()) return;
    setLoading(true);
    setError("");
    setRapport(null);
    try {
      const res = await api.post("/ia/rapport", { demande, ecoMode: isEcoMode });
      setRapport(res.data.rapport);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur service IA");
    } finally {
      setLoading(false);
    }
  };

  const lancerDiagnostic = async () => {
    if (!descPanne.trim()) return;
    setDiagLoad(true);
    setDiagnostic(null);
    try {
      const res = await api.post("/ia/diagnostic", {
        description_panne: descPanne,
        ecoMode: isEcoMode,
      });
      setDiagnostic(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur diagnostic IA");
    } finally {
      setDiagLoad(false);
    }
  };

  const urgenceColor = {
    critique: "#ef4444",
    modere: "#f59e0b",
    faible: "#22c55e",
  };
  const prioriteColor = {
    critique: "#ef4444",
    haute: "#f97316",
    moyenne: "#f59e0b",
  };

  const tabStyle = (tab) => ({
    padding: "0.75rem 1.5rem",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    borderBottom:
      activeTab === tab ? "3px solid #1e3a5f" : "3px solid transparent",
    color: activeTab === tab ? "#1e3a5f" : "#64748b",
    background: "none",
  });

  return (
    <div>
      <h1
        style={{
          fontSize: "1.8rem",
          fontWeight: 700,
          color: "#1e293b",
          margin: 0,
        }}
      >
        🤖 AI Insights
      </h1>
      <p style={{ color: "#64748b", margin: "0.25rem 0 1.5rem" }}>
        Fonctionnalités intelligentes propulsées par Ollama (LLM local)
      </p>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #e2e8f0", marginBottom: "2rem" }}>
        <button
          style={tabStyle("rapport")}
          onClick={() => setActiveTab("rapport")}
        >
          📄 Rapport IA
        </button>
        <button
          style={tabStyle("diagnostic")}
          onClick={() => setActiveTab("diagnostic")}
        >
          🔍 Diagnostic de Panne
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── Rapport IA ─────────────────────────────────── */}
      {activeTab === "rapport" && (
        <div>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem", color: "#1e293b" }}>
              Générer un rapport IA
            </h2>
            <p
              style={{
                color: "#64748b",
                margin: "0 0 1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Décrivez en langage naturel le rapport que vous souhaitez obtenir.
            </p>
            <textarea
              value={demande}
              onChange={(e) => setDemande(e.target.value)}
              placeholder={`Ex: "Génère un rapport mensuel complet pour la direction" ou "Analyse l'état du parc et donne des recommandations"`}
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.95rem",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={genererRapport}
              disabled={loading || !demande.trim()}
              style={{
                marginTop: "1rem",
                padding: "0.85rem 2rem",
                background: loading ? "#93c5fd" : "#1e3a5f",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
              }}
            >
              {loading
                ? "⏳ Génération en cours..."
                : "🚀 Générer le rapport IA"}
            </button>
          </div>

          {/* Résultat rapport */}
          {rapport && (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "2rem",
                boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h2 style={{ margin: 0, color: "#1e293b" }}>
                  📋 Rapport Généré
                </h2>
                <span
                  style={{
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  Propulsé par Ollama (LLM Local)
                </span>
              </div>

              <div
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <h3 style={{ margin: "0 0 0.75rem", color: "#0369a1" }}>
                  📝 Résumé Exécutif
                </h3>
                <p style={{ margin: 0, color: "#1e293b", lineHeight: 1.7 }}>
                  {toString(rapport.resume_executif)}
                </p>
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <h3 style={{ margin: "0 0 0.75rem", color: "#15803d" }}>
                  🔍 Analyse du Parc
                </h3>
                <p style={{ margin: 0, color: "#1e293b", lineHeight: 1.7 }}>
                  {toString(rapport.analyse_parc)}
                </p>
              </div>

              {rapport.tendances?.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 0.75rem", color: "#1e293b" }}>
                    📈 Tendances Observées
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                    {rapport.tendances.map((t, i) => (
                      <li
                        key={i}
                        style={{
                          color: "#374151",
                          marginBottom: "0.4rem",
                          lineHeight: 1.6,
                        }}
                      >
                        {toString(t)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rapport.recommandations?.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 0.75rem", color: "#1e293b" }}>
                    💡 Recommandations
                  </h3>
                  {rapport.recommandations.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        background: "#fafafa",
                        borderRadius: "8px",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background:
                            (prioriteColor[r.priorite] || "#94a3b8") + "20",
                          color: prioriteColor[r.priorite] || "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {toString(r.priorite)?.toUpperCase()}
                      </span>
                      <p
                        style={{ margin: 0, color: "#374151", lineHeight: 1.6 }}
                      >
                        {toString(r.action)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {rapport.conclusion && (
                <div
                  style={{
                    background: "#fafafa",
                    borderRadius: "8px",
                    padding: "1.25rem",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.5rem", color: "#1e293b" }}>
                    ✅ Conclusion
                  </h3>
                  <p style={{ margin: 0, color: "#374151", lineHeight: 1.7 }}>
                    {toString(rapport.conclusion)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Diagnostic IA ──────────────────────────────── */}
      {activeTab === "diagnostic" && (
        <div>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem", color: "#1e293b" }}>
              Diagnostic de Panne Assisté par IA
            </h2>
            <p
              style={{
                color: "#64748b",
                margin: "0 0 1.5rem",
                fontSize: "0.9rem",
              }}
            >
              Décrivez la panne en texte libre — l'IA analyse et propose un
              diagnostic.
            </p>
            <textarea
              value={descPanne}
              onChange={(e) => setDescPanne(e.target.value)}
              placeholder={`Ex: "Le laptop ne démarre plus, on entend un bip et l'écran reste noir" ou "La batterie se décharge en moins d'une heure"`}
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.95rem",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={lancerDiagnostic}
              disabled={diagLoad || !descPanne.trim()}
              style={{
                marginTop: "1rem",
                padding: "0.85rem 2rem",
                background: diagLoad ? "#93c5fd" : "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: diagLoad ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
              }}
            >
              {diagLoad
                ? "⏳ Analyse en cours..."
                : "🔍 Lancer le diagnostic IA"}
            </button>
          </div>

          {diagnostic && (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "2rem",
                boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
              }}
            >
              <h2 style={{ margin: "0 0 1.5rem", color: "#1e293b" }}>
                🩺 Résultat du Diagnostic
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    background: "#fafafa",
                    borderRadius: "8px",
                    padding: "1.25rem",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.4rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Cause Probable
                  </p>
                  <p style={{ margin: 0, fontWeight: 600, color: "#1e293b" }}>
                    {toString(diagnostic.cause_probable)}
                  </p>
                </div>
                <div
                  style={{
                    background: "#fafafa",
                    borderRadius: "8px",
                    padding: "1.25rem",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.4rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Niveau d'Urgence
                  </p>
                  <span
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      background:
                        (urgenceColor[diagnostic.niveau_urgence] || "#94a3b8") +
                        "20",
                      color:
                        urgenceColor[diagnostic.niveau_urgence] || "#64748b",
                    }}
                  >
                    {toString(diagnostic.niveau_urgence)?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ margin: "0 0 0.75rem", color: "#1e293b" }}>
                  🔧 Actions Recommandées
                </h3>
                <ol style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  {(diagnostic.actions_recommandees || []).map((a, i) => (
                    <li
                      key={i}
                      style={{
                        color: "#374151",
                        marginBottom: "0.5rem",
                        lineHeight: 1.6,
                      }}
                    >
                      {toString(a)}
                    </li>
                  ))}
                </ol>
              </div>
              {diagnostic.estimation_duree && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    padding: "1rem",
                  }}
                >
                  <p style={{ margin: 0, color: "#92400e" }}>
                    ⏱️ <strong>Durée estimée :</strong>{" "}
                    {toString(diagnostic.estimation_duree)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
