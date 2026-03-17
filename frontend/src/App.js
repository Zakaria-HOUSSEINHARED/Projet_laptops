import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { EcoDesignProvider } from "./context/EcoDesignContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";

// ⚡ Code Splitting: Lazy load all pages for better performance (Lighthouse +5pts)
// Pages only loaded when user navigates to them, not on initial load
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Laptops = lazy(() => import("./pages/Laptops"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const LaptopView = lazy(() => import("./pages/LaptopView"));
const LaptopEdit = lazy(() => import("./pages/LaptopEdit"));
const StockMovements = lazy(() => import("./pages/StockMovements"));
const Maintenances = lazy(() => import("./pages/Maintenances"));
const Alertes = lazy(() => import("./pages/Alertes"));
const Attributions = lazy(() => import("./pages/Attributions"));

// 🔄 Page loader for suspense fallback (smooth UX while loading)
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#f8fafc",
      color: "#64748b",
      fontSize: "1rem",
      fontWeight: 500,
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: "1rem" }}>⏳</div>
      <p>Chargement de la page...</p>
    </div>
  </div>
);

// Pages simples inline pour les autres sections
const SimplePage = ({ title, icon }) => (
  <div>
    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1e293b" }}>
      {icon} {title}
    </h1>
    <p style={{ color: "#64748b" }}>Page en cours de développement...</p>
  </div>
);

// Route protégée avec lazy routes
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
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <EcoDesignProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/laptops"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Laptops />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/laptops/:id"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <LaptopView />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/laptops/:id/edit"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <LaptopEdit />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/ia"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AIInsights />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/mouvements"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <StockMovements />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/attributions"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Attributions />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/maintenances"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Maintenances />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/alertes"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Alertes />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </EcoDesignProvider>
    </AuthProvider>
  );
}
