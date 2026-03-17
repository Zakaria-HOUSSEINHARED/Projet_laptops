import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";

// 🔄 Lazy load pages lourdes (Dashboard charge les graphiques tard déjà!)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Laptops = lazy(() => import("./pages/Laptops"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const LaptopView = lazy(() => import("./pages/LaptopView"));
const LaptopEdit = lazy(() => import("./pages/LaptopEdit"));
const StockMovements = lazy(() => import("./pages/StockMovements"));

// Pages simples inline pour les autres sections
const SimplePage = ({ title, icon }) => (
  <div>
    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1e293b" }}>
      {icon} {title}
    </h1>
    <p style={{ color: "#64748b" }}>Page en cours de développement...</p>
  </div>
);

// Loading fallback
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "50vh",
      color: "#64748b",
    }}
  >
    ⏳ Chargement de la page...
  </div>
);

// Route protégée
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#64748b",
        }}
      >
        Chargement...
      </div>
    );
  return user ? (
    <Layout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </Layout>
  ) : (
    <Navigate to="/login" />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/laptops"
            element={
              <PrivateRoute>
                <Laptops />
              </PrivateRoute>
            }
          />
          <Route
            path="/laptops/:id"
            element={
              <PrivateRoute>
                <LaptopView />
              </PrivateRoute>
            }
          />
          <Route
            path="/laptops/:id/edit"
            element={
              <PrivateRoute>
                <LaptopEdit />
              </PrivateRoute>
            }
          />
          <Route
            path="/ia"
            element={
              <PrivateRoute>
                <AIInsights />
              </PrivateRoute>
            }
          />
          <Route
            path="/mouvements"
            element={
              <PrivateRoute>
                <StockMovements />
              </PrivateRoute>
            }
          />
          <Route
            path="/attributions"
            element={
              <PrivateRoute>
                <SimplePage title="Attributions" icon="👤" />
              </PrivateRoute>
            }
          />
          <Route
            path="/maintenances"
            element={
              <PrivateRoute>
                <SimplePage title="Maintenances" icon="🔧" />
              </PrivateRoute>
            }
          />
          <Route
            path="/alertes"
            element={
              <PrivateRoute>
                <SimplePage title="Alertes" icon="🔔" />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
