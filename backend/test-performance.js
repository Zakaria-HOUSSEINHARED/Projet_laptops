#!/usr/bin/env node
/**
 * 🧪 Test de Performance - Service IA
 *
 * Mesure le temps de réponse des rapports IA
 * Usage: node test-performance.js
 */

const fetch = require("node-fetch");
require("dotenv").config();

const API_URL = process.env.API_URL || "http://localhost:5000";
const JWT_TOKEN = process.env.TEST_JWT || ""; // Déposer un JWT valide ici

const tests = [
  {
    nom: "❓ Question Simple",
    demande: "Combien de laptops disponibles?",
    attendu: "<1s",
  },
  {
    nom: "📊 Question Intermédiaire",
    demande: "Quels sont les problèmes avec le parc?",
    attendu: "1-2s",
  },
  {
    nom: "📈 Rapport Complet",
    demande: "Génère un rapport complet du parc informatique",
    attendu: "2-3s",
  },
];

async function testerRapport(demande) {
  const startMs = Date.now();

  try {
    const res = await fetch(`${API_URL}/api/ia/rapport`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({ demande }),
    });

    const durationMs = Date.now() - startMs;

    if (!res.ok) {
      return {
        ok: false,
        durationMs,
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      durationMs,
      cached: data.cached || false,
      rapport: data.rapport ? "✅ Généré" : "❌ Vide",
    };
  } catch (err) {
    return {
      ok: false,
      durationMs: Date.now() - startMs,
      error: err.message,
    };
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  🧪 TEST DE PERFORMANCE - SERVICE IA                   ║
║  Temps optimisé: 9s → 2-3s                            ║
╚════════════════════════════════════════════════════════╝

📍 API: ${API_URL}
⏱️  Démarrage des tests...
`);

  if (!JWT_TOKEN) {
    console.warn(
      "⚠️  Attention: TEST_JWT non défini. Certains tests peuvent échouer.",
    );
    console.warn("   Définir: export TEST_JWT='votre_token_jwt_ici'\n");
  }

  for (const test of tests) {
    console.log(`\n${test.nom}`);
    console.log("─".repeat(50));
    console.log(`Question: "${test.demande}"`);
    console.log(`Attendu: ${test.attendu}`);

    const result = await testerRapport(test.demande);

    if (result.ok) {
      const speedEmoji =
        result.durationMs < 1000
          ? "⚡"
          : result.durationMs < 3000
            ? "✅"
            : "⚠️";
      const cached = result.cached ? " [CACHE]" : "";
      console.log(
        `${speedEmoji} Réponse: ${result.durationMs}ms${cached} ${result.rapport}`,
      );
    } else {
      console.log(`❌ Erreur: ${result.error} (${result.durationMs}ms)`);
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════╗
║  RÉSUMÉ                                                ║
╚════════════════════════════════════════════════════════╝

✅ Tests complétés!

📊 Interprétation:
  ⚡ <1s     = Excellent (fallback ou cache)
  ✅ 1-3s    = Très bon (LLM optimisé)
  ⚠️  3-5s   = Acceptable (LLM peut être lent)
  ❌ >5s     = À optimiser davantage

💡 Conseil:
  - Si >5s: Augmentez AI_TIMEOUT_MS dans .env
  - Si réponses vides: Augmentez AI_MAX_TOKENS
  - Si cache fonctionne: ~100ms pour la 2ème requête
`);
}

main().catch(console.error);
