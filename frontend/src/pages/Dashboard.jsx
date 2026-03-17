import { useState, useEffect, lazy, Suspense } from "react";
import api from "../services/api";
import { useEcoDesign } from "../context/EcoDesignContext";

// 🔄 Lazy load Charts (Code Splitting - économise 420 Kio!)
const ChartsSection = lazy(() => import("../components/ChartsSection"));

const StatCard = ({ icon, label, value, color, sub }) => (
  <div
    style={{
      background: "white",
      borderRadius: "12px",
      padding: "1rem",
      boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
      borderLeft: `4px solid ${color}`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>
          {label}
        </p>
        <p
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#1e293b",
            margin: "0.25rem 0 0",
          }}
        >
          {value}
        </p>
        {sub && (
          <p style={{ color: "#64748b", fontSize: "0.65rem", margin: 0 }}>
            {sub}
          </p>
        )}
      </div>
      <span style={{ fontSize: "2rem", flexShrink: 0 }}>{icon}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const { isEcoMode } = useEcoDesign();
  const [stats, setStats] = useState(null);
  const [alerte, setAlerte] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/laptops/stats").then((r) => setStats(r.data)),
      api
        .get("/ia/alertes-stock?ecoMode=" + isEcoMode)
        .then((r) => setAlerte(r.data)),
    ]).finally(() => setLoading(false));
  }, [isEcoMode]);

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
        Chargement...
      </div>
    );
  if (!stats)
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#ef4444" }}>
        Erreur de chargement
      </div>
    );

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
      <h1
        style={{
          fontSize: "1.3rem",
          fontWeight: 700,
          color: "#1e293b",
          marginBottom: "0.25rem",
        }}
      >
        Dashboard
      </h1>
      <p style={{ color: "#475569", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Vue d'ensemble du parc informatique
      </p>

      {/* Stats cards - 📱 Responsive: 1x mobile, 2x tablet, 4x desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          icon="💻"
          label="Total Laptops"
          value={stats.total}
          color="#6366f1"
          sub="dans le système"
        />
        <StatCard
          icon="✅"
          label="Disponibles"
          value={stats.disponibles}
          color="#22c55e"
          sub={`${Math.round((stats.disponibles / stats.total) * 100)}% du total`}
        />
        <StatCard
          icon="👤"
          label="Attribués"
          value={stats.attribues}
          color="#3b82f6"
          sub={`${Math.round((stats.attribues / stats.total) * 100)}% du total`}
        />
        <StatCard
          icon="🔧"
          label="En maintenance"
          value={stats.maintenance}
          color="#f59e0b"
          sub={`${Math.round((stats.maintenance / stats.total) * 100)}% du total`}
        />
      </div>

      {/* 🔄 Lazy loaded Charts */}
      <Suspense
        fallback={
          <div
            style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}
          >
            Chargement des graphiques...
          </div>
        }
      >
        <ChartsSection stats={stats} />
      </Suspense>
    </div>
  );
}
