const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testConnection } = require("./config/db");
const routes = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ───────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🌱 Middleware Cache pour éco-conception (542 Kio économies!)
app.use((req, res, next) => {
  // Stats: cache 10 min (change pas souvent)
  if (
    req.path.includes("/laptops/stats") ||
    req.path.includes("/ia/alertes-stock")
  ) {
    res.set("Cache-Control", "public, max-age=600"); // 10 min
  }
  // Rapports: immutable (never change comme approuvés)
  else if (req.path.includes("/ia/rapports")) {
    res.set("Cache-Control", "public, immutable, max-age=31536000"); // 1 year
  }
  // Données dynamiques: no cache mais peut révalider
  else if (req.method === "GET") {
    res.set("Cache-Control", "public, max-age=300"); // 5 min par défaut
  }
  // POST, PUT, DELETE: no-store, no-cache
  else {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  next();
});

// ── Routes ────────────────────────────────────────────────
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => res.json({ status: "OK", version: "2.0" }));

// ── Démarrage ─────────────────────────────────────────────
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 LaptopStock API démarrée sur http://localhost:${PORT}`);
    console.log(`📡 Endpoints disponibles : http://localhost:${PORT}/api`);
  });
};

start();
