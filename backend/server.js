const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const routes             = require('./routes/index');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ───────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', version: '2.0' }));

// ── Démarrage ─────────────────────────────────────────────
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 LaptopStock API démarrée sur http://localhost:${PORT}`);
    console.log(`📡 Endpoints disponibles : http://localhost:${PORT}/api`);
  });
};

start();
