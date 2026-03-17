import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [mot_de_passe, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, mot_de_passe);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f4f8",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#1e3a5f",
              margin: 0,
            }}
          >
            💻 LaptopStock
          </h1>
          <p
            style={{
              color: "#475569",
              marginTop: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            Connectez-vous à votre compte
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="email-input"
              style={{
                display: "block",
                marginBottom: "0.4rem",
                fontWeight: 600,
                color: "#1f2937",
                fontSize: "0.85rem",
              }}
            >
              Email
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@laptopstock.com"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.95rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="password-input"
              style={{
                display: "block",
                marginBottom: "0.4rem",
                fontWeight: 600,
                color: "#1f2937",
                fontSize: "0.85rem",
              }}
            >
              Mot de passe
            </label>
            <input
              id="password-input"
              type="password"
              value={mot_de_passe}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.95rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.85rem",
              background: loading ? "#93c5fd" : "#1e3a5f",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.75rem",
            marginTop: "1.5rem",
          }}
        >
          Compte test : admin@laptopstock.com
        </p>
      </div>
    </div>
  );
}
