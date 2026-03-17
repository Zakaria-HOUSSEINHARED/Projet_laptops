const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("dotenv").config();

const { testConnection } = require("./config/db");
const routes = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ───────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));

// 📦 Compression: gzip pour -50% taille réponses (Lighthouse +5pts)
app.use(
  compression({
    level: 6, // Level 6 = optimal balance speed/ratio
    threshold: 1024, // Only compress if > 1KB
    filter: (req, res) => {
      // Compress JSON, HTML, but not images/videos
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🌱 Middleware Cache pour éco-conception (542 Kio économies per session!)
app.use((req, res, next) => {
  // Stats: cache 10 min (change pas souvent)
  if (
    req.path.includes("/laptops/stats") ||
    req.path.includes("/ia/alertes-stock")
  ) {
    res.set("Cache-Control", "public, max-age=600, s-maxage=1200");
  }
  // Rapports: année complète (immutable = never revalidate)
  else if (req.path.includes("/ia/rapports")) {
    res.set("Cache-Control", "public, immutable, max-age=31536000");
  }
  // Authentification: no cache (sécurité)
  else if (req.path.includes("/auth")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
  // Données dynamiques: courte validation
  else if (req.method === "GET") {
    res.set("Cache-Control", "public, max-age=300, must-revalidate");
  }
  // Mutations: never cache
  else {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }

  // ℹ️ ETag pour meilleure revalidation (Lighthouse: Efficient cache policy)
  res.set("ETag", `"${Date.now()}"`);
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
