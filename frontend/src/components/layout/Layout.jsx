import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEcoDesign } from "../../context/EcoDesignContext";
import "../../styles/ecoMode.css";

const navItems = [
  { path: "/", icon: "📊", label: "Dashboard" },
  { path: "/laptops", icon: "💻", label: "Laptops" },
  { path: "/mouvements", icon: "📦", label: "Mouvements" },
  { path: "/attributions", icon: "👤", label: "Attributions" },
  { path: "/maintenances", icon: "🔧", label: "Maintenance" },
  { path: "/ia", icon: "🤖", label: "AI Insights" },
  { path: "/alertes", icon: "🔔", label: "Alertes" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isEcoMode, toggleEcoMode } = useEcoDesign();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" && window.innerWidth >= 768,
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // 📱 Écouter les changements de taille d'écran
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={isEcoMode ? "eco-mode" : ""}
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        background: isEcoMode ? "#fafafa" : "#f8fafc",
      }}
    >
      {/* 📱 Mobile menu toggle */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: isDesktop ? "none" : "block",
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 200,
          background: "#1e3a5f",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "0.5rem 0.75rem",
          cursor: "pointer",
          fontSize: "1.2rem",
        }}
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: isDesktop ? (collapsed ? "64px" : "240px") : "240px",
          transition: "width 0.2s",
          background: isEcoMode ? "#f3f4f6" : "#1e3a5f",
          color: isEcoMode ? "#1f2937" : "white",
          display: "flex",
          flexDirection: "column",
          position: isDesktop ? "fixed" : "fixed",
          height: "100vh",
          zIndex: mobileMenuOpen ? 150 : isDesktop ? 100 : -1,
          left: isDesktop ? 0 : mobileMenuOpen ? 0 : "-100%",
          transition: isDesktop ? "width 0.2s" : "left 0.3s",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "1.5rem 1rem",
            borderBottom: isEcoMode
              ? "1px solid #d1d5db"
              : "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>💻</span>
          {((!collapsed && isDesktop) || !isDesktop) && (
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>
              LaptopStock
            </span>
          )}
          {isDesktop && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: isEcoMode ? "#374151" : "white",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              {collapsed ? "→" : "←"}
            </button>
          )}
          {!isDesktop && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: isEcoMode ? "#374151" : "white",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "1rem 0.5rem", overflowY: "auto" }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => !isDesktop && setMobileMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 0.75rem",
                borderRadius: "8px",
                marginBottom: "0.25rem",
                textDecoration: "none",
                color: isEcoMode ? "#374151" : "white",
                fontSize: "0.9rem",
                fontWeight: 500,
                background:
                  location.pathname === item.path
                    ? isEcoMode
                      ? "#e5e7eb"
                      : "rgba(255,255,255,0.15)"
                    : "transparent",
                transition: "background 0.15s",
              }}
            >
              <span
                style={{
                  fontSize: "1.1rem",
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {item.icon}
              </span>
              {((!collapsed && isDesktop) || !isDesktop) && item.label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div
          style={{
            padding: "1rem",
            borderTop: isEcoMode
              ? "1px solid #d1d5db"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {((!collapsed && isDesktop) || !isDesktop) && (
            <div
              style={{
                marginBottom: "0.5rem",
                fontSize: "0.8rem",
                opacity: 0.8,
                color: isEcoMode ? "#374151" : "inherit",
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {user?.prenom} {user?.nom}
              </div>
              <div style={{ opacity: 0.7 }}>{user?.role}</div>
            </div>
          )}
          <button
            onClick={toggleEcoMode}
            title={
              isEcoMode
                ? "Désactiver mode éco-conception"
                : "Activer mode éco-conception"
            }
            style={{
              width: "100%",
              padding: "0.5rem",
              background: isEcoMode
                ? "rgba(34, 197, 94, 0.2)"
                : "rgba(255,255,255,0.1)",
              color: isEcoMode ? "#22c55e" : "white",
              border: isEcoMode
                ? "1px solid #22c55e"
                : "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
              fontWeight: isEcoMode ? 600 : 400,
              transition: "all 0.3s",
            }}
          >
            {isEcoMode ? "♻️ Éco-conception" : "♻️ Mode normal"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: isEcoMode ? "#f3f4f6" : "rgba(255,255,255,0.1)",
              color: isEcoMode ? "#374151" : "white",
              border: isEcoMode ? "1px solid #d1d5db" : "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {collapsed && isDesktop ? "🚪" : "🚪 Déconnexion"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          marginLeft: isDesktop ? (collapsed ? "64px" : "240px") : 0,
          flex: 1,
          transition: "margin-left 0.2s",
          paddingTop: !isDesktop ? "4rem" : "2rem",
          paddingLeft: !isDesktop ? "1rem" : "2rem",
          paddingRight: !isDesktop ? "1rem" : "2rem",
          paddingBottom: "2rem",
          minHeight: "100vh",
          background: isEcoMode ? "#fafafa" : "#f8fafc",
        }}
      >
        {children}
      </main>
    </div>
  );
}
