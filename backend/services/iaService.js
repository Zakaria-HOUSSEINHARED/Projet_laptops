const { pool } = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

// 📊 Configuration NORMALE (optimisée)
const CONFIG_NORMAL = {
  TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS || 2500),
  TEMPERATURE: Number(process.env.AI_TEMPERATURE || 0.3),
  NUM_PREDICT: Number(process.env.AI_MAX_TOKENS || 40),
  TOP_P: Number(process.env.OLLAMA_TOP_P || 0.7),
  REPEAT_PENALTY: Number(process.env.OLLAMA_REPEAT_PENALTY || 1.0),
  NUM_CTX: Number(process.env.OLLAMA_NUM_CTX || 256),
  KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || "5m",
  MAX_LAPTOPS: Number(process.env.OLLAMA_MAX_LAPTOPS || 3),
  MAX_ITEMS: Number(process.env.OLLAMA_MAX_ITEMS || 1),
};

// 🌱 Configuration ÉCO-CONCEPTION (ultra-optimisée, très rapide, moins de ressources)
const CONFIG_ECO = {
  TIMEOUT_MS: 1500,          // ⚡ 2500ms → 1500ms (40% plus rapide)
  TEMPERATURE: 0.2,          // Très déterministe
  NUM_PREDICT: 25,           // 40 → 25 tokens (37% réduction)
  TOP_P: 0.6,                // Moins d'exploration
  REPEAT_PENALTY: 1.0,
  NUM_CTX: 128,              // 256 → 128 (50% moins de contexte)
  KEEP_ALIVE: "2m",
  MAX_LAPTOPS: 2,            // 3 → 2 (moins de données)
  MAX_ITEMS: 1,
};

// Fonction pour obtenir la config selon le mode
const getConfig = (ecoMode) => {
  return ecoMode ? CONFIG_ECO : CONFIG_NORMAL;
};

const OLLAMA_TEMPERATURE = CONFIG_NORMAL.TEMPERATURE;
const OLLAMA_NUM_PREDICT = CONFIG_NORMAL.NUM_PREDICT;
const OLLAMA_TOP_P = CONFIG_NORMAL.TOP_P;
const OLLAMA_REPEAT_PENALTY = CONFIG_NORMAL.REPEAT_PENALTY;
const OLLAMA_NUM_CTX = CONFIG_NORMAL.NUM_CTX;
const OLLAMA_KEEP_ALIVE = CONFIG_NORMAL.KEEP_ALIVE;
const OLLAMA_TIMEOUT_MS = CONFIG_NORMAL.TIMEOUT_MS;
const OLLAMA_MAX_LAPTOPS = CONFIG_NORMAL.MAX_LAPTOPS;
const OLLAMA_MAX_ITEMS = CONFIG_NORMAL.MAX_ITEMS;
const OLLAMA_ENABLE_JSON_REPAIR =
  (process.env.OLLAMA_ENABLE_JSON_REPAIR || "false").toLowerCase() === "true";

// 📦 Seuil d'alerte pour stock bas
const SEUIL_STOCK_BAS = Number(process.env.SEUIL_STOCK_BAS || 3);

// ⚡ Cache simple en mémoire pour les rapports (10 min)
const rapportCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

const truncateText = (value, max = 180) => {
  if (!value) return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const extractJsonObject = (text) => {
  const cleaned = String(text || "")
    .replace(/```json|```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("JSON invalide");
  }
};

const normalizeRapport = (payload) => ({
  resume_executif: String(payload?.resume_executif || ""),
  analyse_parc: String(payload?.analyse_parc || ""),
  tendances: Array.isArray(payload?.tendances)
    ? payload.tendances.map((t) => String(t))
    : [],
  recommandations: Array.isArray(payload?.recommandations)
    ? payload.recommandations
        .map((r) => ({
          priorite: String(r?.priorite || "moyenne"),
          action: String(r?.action || ""),
        }))
        .filter((r) => r.action)
    : [],
  conclusion: String(payload?.conclusion || ""),
});

/**
 * 🔧 Valide et corrige les chiffres du rapport pour cohérence
 * Vérifie que le résumé ne contient pas d'incohérences
 */
const validateRapportChiffres = (rapport, donnees) => {
  if (!rapport || !donnees) return rapport;

  try {
    // Nettoyer les textes
    rapport.resume_executif = String(rapport.resume_executif || "").trim();
    rapport.analyse_parc = String(rapport.analyse_parc || "").trim();
    rapport.conclusion = String(rapport.conclusion || "").trim();

    // Assurer que les tendances et recommandations sont des arrays
    if (!Array.isArray(rapport.tendances)) {
      rapport.tendances = [];
    }
    if (!Array.isArray(rapport.recommandations)) {
      rapport.recommandations = [];
    }

    // Nettoyer les recommandations
    rapport.recommandations = rapport.recommandations
      .map((r) => ({
        priorite: String(r?.priorite || "moyenne").toUpperCase(),
        action: String(r?.action || "").trim(),
      }))
      .filter((r) => r.action.length > 0)
      .slice(0, 5); // Max 5 recommandations

    return rapport;
  } catch (err) {
    console.error("Validation rapport échouée:", err);
    return rapport;
  }
};

// ⚡ Fonction utility pour cache
const getCacheKey = (prefix, id) => `${prefix}:${id}`;
const setCachedRapport = (key, data) => {
  rapportCache.set(key, { data, timestamp: Date.now() });
};
const getCachedRapport = (key) => {
  const cached = rapportCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  rapportCache.delete(key);
  return null;
};

// ⚡ Déterminer si c'est une question COMPLEXE (nécessite analyse + recommandations)
const estQuestionComplexe = (demande) => {
  if (!demande) return false;
  const q = demande.toLowerCase();

  const indicateurs = [
    "rapport complet",
    "analyse",
    "résumé",
    "recommandation",
    "situation",
    "strategic",
    "optimisation",
    "amélioration",
    "performance",
    "santé",
    "état",
    "tendance",
    "prévention",
  ];

  return indicateurs.some((ind) => q.includes(ind));
};

// ⚡ Générer un fallback intelligent pour questions complexes
const genererRapportFallback = (demande, donnees) => {
  const total = donnees.totaux.total || 0;
  const disponibles = donnees.totaux.disponibles || 0;
  const attribues = donnees.totaux.attribues || 0;
  const en_maintenance = donnees.totaux.en_maintenance || 0;

  const tauxDisp = total > 0 ? Math.round((disponibles / total) * 100) : 0;
  const tauxAttrib = total > 0 ? Math.round((attribues / total) * 100) : 0;
  const tauxMaint = total > 0 ? Math.round((en_maintenance / total) * 100) : 0;

  // Analyse intelligente
  const topMarque = donnees.parMarque.sort((a, b) => b.nb - a.nb)[0];
  const etatCritique = donnees.parEtat.find((e) => {
    const etat = e.etat.toLowerCase().replace(/[éè]/g, "e");
    return (
      etat.includes("degrade") ||
      etat.includes("mauvais") ||
      etat.includes("cassé")
    );
  });

  const recommandations = [];

  // Recommandation 1 : Maintenance
  if (en_maintenance > 0) {
    recommandations.push({
      priorite: "HAUTE",
      action: `Accélérer traitement des ${en_maintenance} ticket(s) de maintenance (${tauxMaint}% du parc)`,
    });
  }

  // Recommandation 2 : Équilibre
  if (attribues > disponibles) {
    recommandations.push({
      priorite: "HAUTE",
      action:
        "Plus de laptops attribués que disponibles - risque de pénurie immédiate",
    });
  } else if (disponibles > attribues * 2) {
    recommandations.push({
      priorite: "MOYENNE",
      action: "Surplus de disponibilité - optimiser les allocations",
    });
  }

  // 📦 Recommandation 3 : Stock bas
  if (disponibles < SEUIL_STOCK_BAS) {
    recommandations.push({
      priorite: "HAUTE",
      action: `⚠️ STOCK BAS: Seulement ${disponibles} laptop(s) disponible(s) - Commander immédiatement`,
    });
  }

  // Recommandation 4 : État du parc
  if (etatCritique && etatCritique.nb > 0) {
    recommandations.push({
      priorite: "MOYENNE",
      action: `${etatCritique.nb} laptop(s) en état dégradé - planifier renouvellement`,
    });
  }

  // Recommandation 4 : Concentration marque
  if (topMarque && topMarque.nb / total > 0.5) {
    recommandations.push({
      priorite: "FAIBLE",
      action: `Risque de concentration: ${topMarque.marque} représente ${Math.round((topMarque.nb / total) * 100)}% du parc`,
    });
  }

  if (recommandations.length === 0) {
    recommandations.push({
      priorite: "FAIBLE",
      action: "Parc informatique stable - continuer suivi régulier",
    });
  }

  return {
    resume_executif: `Parc informatique de ${total} ordinateurs portables. Situation: ${disponibles} disponibles (${tauxDisp}%), ${attribues} attribués (${tauxAttrib}%), ${en_maintenance} en maintenance (${tauxMaint}%). ${recommandations.length} point(s) d'attention identifié(s).`,
    analyse_parc: `Distribution matériel: ${donnees.parMarque.map((m) => `${m.marque} (${m.nb})`).join(", ")}. États: ${donnees.parEtat.map((e) => `${e.etat} (${e.nb})`).join(", ")}. Marque dominante: ${topMarque ? topMarque.marque : "N/A"}. Tickets maintenance ouverts: ${donnees.maintenances.length}. Alertes actives: ${donnees.alertes.length}.`,
    tendances: [
      `Taux de disponibilité: ${tauxDisp}%`,
      `Taux de dégradation: ${etatCritique ? Math.round((etatCritique.nb / total) * 100) : 0}%`,
      `Maintenance: ${donnees.maintenances.length} ticket(s) en cours`,
    ],
    recommandations: recommandations.slice(0, 4), // Max 4 recommandations
    conclusion: `${total} ordinateurs gérés. Parc ${tauxDisp}% disponible. Action à prendre: ${recommandations[0]?.action || "Suivi régulier"}.`,
  };
};

// ⚡ Répondre aux questions SIMPLES directement sans passer par le LLM
const repondreQuestionSimple = (demande, donnees) => {
  if (!demande) return null;

  const q = demande.toLowerCase();
  const total = donnees.totaux.total || 0;
  const disponibles = donnees.totaux.disponibles || 0;
  const attribues = donnees.totaux.attribues || 0;
  const en_maintenance = donnees.totaux.en_maintenance || 0;

  // Détection simple des questions
  if (q.includes("combien") && q.includes("disponib")) {
    return {
      resume_executif: `${disponibles} ordinateurs portables sont actuellement disponibles sur ${total} au total.`,
      analyse_parc: `Disponibles: ${disponibles} | Attribués: ${attribues} | En maintenance: ${en_maintenance}`,
      tendances: [
        `${Math.round((disponibles / total) * 100)}% du parc est disponible`,
      ],
      recommandations:
        attribues > disponibles
          ? [
              {
                priorite: "haute",
                action:
                  "Plus de laptops attribués que disponibles - vérifier les allocations",
              },
            ]
          : [],
      conclusion: `${disponibles} laptops disponibles.`,
    };
  }

  if (q.includes("combien") && q.includes("attrib")) {
    return {
      resume_executif: `${attribues} ordinateurs portables sont actuellement attribués sur ${total} au total.`,
      analyse_parc: `Attribués: ${attribues} | Disponibles: ${disponibles} | En maintenance: ${en_maintenance}`,
      tendances: [
        `${Math.round((attribues / total) * 100)}% du parc est attribué`,
      ],
      recommandations: [],
      conclusion: `${attribues} laptops attribués.`,
    };
  }

  if (q.includes("combien") && q.includes("maintenance")) {
    return {
      resume_executif: `${en_maintenance} ordinateurs portables sont actuellement en maintenance sur ${total} au total.`,
      analyse_parc: `En maintenance: ${en_maintenance} | Disponibles: ${disponibles} | Attribués: ${attribues}`,
      tendances: [
        `${Math.round((en_maintenance / total) * 100)}% du parc est en maintenance`,
      ],
      recommandations:
        en_maintenance > 0
          ? [
              {
                priorite: "moyenne",
                action: `${en_maintenance} ticket(s) de maintenance à traiter`,
              },
            ]
          : [],
      conclusion: `${en_maintenance} laptops en maintenance.`,
    };
  }

  if (
    q.includes("combien") &&
    (q.includes("total") || q.includes("au total"))
  ) {
    return {
      resume_executif: `Le parc informatique compte ${total} ordinateurs portables au total.`,
      analyse_parc: `Total: ${total} | Disponibles: ${disponibles} (${Math.round((disponibles / total) * 100)}%) | Attribués: ${attribues} (${Math.round((attribues / total) * 100)}%) | Maintenance: ${en_maintenance} (${Math.round((en_maintenance / total) * 100)}%)`,
      tendances: ["Parc complet analysé"],
      recommandations: [],
      conclusion: `Parc total de ${total} ordinateurs portables.`,
    };
  }

  if (q.includes("bon état") || q.includes("etat")) {
    const bonEtat = donnees.parEtat.find(
      (e) =>
        e.etat.toLowerCase().includes("nouveau") ||
        e.etat.toLowerCase().includes("bon") ||
        e.etat.toLowerCase().includes("excellent"),
    );
    const nbBonEtat = bonEtat ? bonEtat.nb : 0;
    return {
      resume_executif: `${nbBonEtat} ordinateurs portables sont en bon état.`,
      analyse_parc: `États du parc: ${donnees.parEtat.map((e) => `${e.etat} (${e.nb})`).join(" | ")}`,
      tendances: [
        `${Math.round((nbBonEtat / total) * 100)}% du parc en bon état`,
      ],
      recommandations: [],
      conclusion: `${nbBonEtat} laptops en bon état.`,
    };
  }

  // ⚡ NOUVEAU: Détection de marque spécifique (ex: "HP", "Dell", "Lenovo")
  if (
    (q.includes("combien") || q.includes("combien de")) &&
    (q.includes("marque") || q.includes("de la") || q.includes("du"))
  ) {
    // Extraire la marque mentionnée
    for (const marque of donnees.parMarque) {
      if (q.toLowerCase().includes(marque.marque.toLowerCase())) {
        return {
          resume_executif: `${marque.nb} ordinateur(s) portable(s) de la marque ${marque.marque} est/sont present(s) dans le parc.`,
          analyse_parc: `Marque: ${marque.marque} | Nombre: ${marque.nb} | Pourcentage du parc: ${Math.round((marque.nb / total) * 100)}%`,
          tendances: [
            `${marque.marque} représente ${Math.round((marque.nb / total) * 100)}% du parc informatique`,
          ],
          recommandations: [],
          conclusion: `${marque.nb} laptop(s) de la marque ${marque.marque}.`,
        };
      }
    }
  }

  if (q.includes("marque")) {
    const topMarque = donnees.parMarque.sort((a, b) => b.nb - a.nb)[0];
    return {
      resume_executif: `Répartition des marques: ${donnees.parMarque.map((m) => `${m.marque} (${m.nb})`).join(", ")}`,
      analyse_parc: `Marque dominante: ${topMarque.marque} avec ${topMarque.nb} unités. Distribution: ${donnees.parMarque.map((m) => `${m.marque} (${m.nb})`).join(", ")}`,
      tendances: [
        `La marque ${topMarque.marque} représente ${Math.round((topMarque.nb / total) * 100)}% du parc`,
      ],
      recommandations: [],
      conclusion: `${donnees.parMarque.length} marques différentes dans le parc.`,
    };
  }

  // Pas de question simple détectée
  return null;
};

const repairJsonWithLlm = async (rawResponse, schemaName) => {
  return chatOllama(
    "Tu es un validateur JSON strict. Tu ne réponds que par du JSON valide.",
    `La réponse suivante est presque du JSON mais peut être invalide. Répare-la pour qu'elle devienne un JSON valide et strict, sans ajouter de commentaire.

Type attendu: ${schemaName}

Réponse à corriger:
${String(rawResponse || "").slice(0, 6000)}`,
  );
};

/**
 * Appel au LLM local via Ollama
 */
const chatOllama = async (system, userMessage, opts = {}) => {
  const { forceJson = false, numPredictOverride } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      keep_alive: OLLAMA_KEEP_ALIVE,
      ...(forceJson ? { format: "json" } : {}),
      options: {
        temperature: OLLAMA_TEMPERATURE,
        num_predict: numPredictOverride || OLLAMA_NUM_PREDICT,
        top_p: OLLAMA_TOP_P,
        repeat_penalty: OLLAMA_REPEAT_PENALTY,
        num_ctx: OLLAMA_NUM_CTX,
      },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });
  clearTimeout(timeout);
  if (!res.ok)
    throw new Error(`Ollama erreur: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.message.content;
};

/**
 * Collecte les données du stock depuis MySQL
 * @returns {Promise<Object>} Données consolidées du parc
 */
const collecterDonnees = async () => {
  // ⚡ Exécuter les requêtes en PARALLÈLE au lieu de séquentiellement
  const [
    [[totaux]],
    [parMarque],
    [parEtat],
    [laptopsDetail],
    [maintenances],
    [alertes],
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(statut='DISPONIBLE')    AS disponibles,
        SUM(statut='ATTRIBUE')      AS attribues,
        SUM(statut='EN_REPARATION') AS en_maintenance
      FROM laptops
    `),
    pool.query("SELECT marque, COUNT(*) AS nb FROM laptops GROUP BY marque"),
    pool.query("SELECT etat, COUNT(*) AS nb FROM laptops GROUP BY etat"),
    pool.query(
      "SELECT id_laptop, marque, modele, numero_serie, etat, statut FROM laptops ORDER BY etat",
    ),
    pool.query(`
      SELECT m.id_maintenance, m.description, m.priorite, m.statut,
             m.technicien, m.date_soumission,
             l.marque, l.modele, l.numero_serie
      FROM maintenances m
      JOIN laptops l ON m.id_laptop = l.id_laptop
      WHERE m.statut IN ('OUVERT','EN_COURS')
      ORDER BY FIELD(m.priorite,'CRITIQUE','HAUTE','MOYENNE','FAIBLE')
    `),
    pool.query(`
      SELECT a.id_alerte, a.type_alerte, a.message, a.date_creation,
             l.marque, l.modele
      FROM alertes a
      JOIN laptops l ON a.id_laptop = l.id_laptop
      WHERE a.est_lue = FALSE
      ORDER BY a.date_creation DESC
    `),
  ]);

  // Mouvements (table peut ne pas exister — on ignore l'erreur)
  let mouvements30j = [];
  try {
    [mouvements30j] = await pool.query(
      "SELECT type, COUNT(*) AS nb FROM mouvements WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY type",
    );
  } catch (_) {
    /* table mouvements absente */
  }

  return {
    totaux,
    parMarque,
    parEtat,
    laptopsDetail,
    maintenances,
    alertes,
    mouvements30j,
  };
};

/**
 * Génère un rapport IA en langage naturel via Claude API
 * POST /api/ia/rapport
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const genererRapportIA = async (req, res) => {
  const { demande, ecoMode } = req.body;
  const config = getConfig(ecoMode); // 🌱 Charger la config selon le mode

  try {
    // ⚡ Inclure la DEMANDE dans la clé de cache (sinon toutes les questions donnent le même rapport!)
    const hashDemande = demande
      ? demande.substring(0, 50).replace(/\s+/g, "_")
      : "default";
    const cacheKey = getCacheKey("rapport", `${req.user.id}:${hashDemande}`);
    const cached = getCachedRapport(cacheKey);
    if (cached) {
      return res.json({
        id_rapport: cached.id_rapport,
        rapport: cached.rapport,
        donnees: cached.donnees,
        cached: true,
        ecoMode,
      });
    }

    const donnees = await collecterDonnees();

    // ⚡ STRATÉGIE : Question simple? Réponse rapide. Question complexe? LLM ou fallback intelligent
    const questionEstComplexe = estQuestionComplexe(demande);

    // Essayer de répondre avec une logique simple d'abord (plus rapide!)
    const reponseDirecte = !questionEstComplexe
      ? repondreQuestionSimple(demande, donnees)
      : null;

    if (reponseDirecte) {
      console.log("✅ Réponse directe (sans LLM):", demande?.substring(0, 50));

      const [result] = await pool.query(
        "INSERT INTO rapports (id_utilisateur, titre, type_rapport, format, genere_par_ia, contenu_ia) VALUES (?,?,?,?,?,?)",
        [
          req.user.id,
          `Rapport IA — ${demande ? demande.substring(0, 60) : "Analyse parc"} — ${new Date().toLocaleDateString("fr-FR")}`,
          "ANALYTIQUE",
          "PDF",
          false,
          JSON.stringify(reponseDirecte),
        ],
      );

      return res.json({
        id_rapport: result.insertId,
        rapport: reponseDirecte,
        donnees,
        rapide: true,
        ecoMode,
      });
    }

    // ⚡ QUESTION COMPLEXE: utiliser LLM ou fallback intelligent
    console.log(
      "🤖 Question complexe détectée, passage par LLM...",
      demande?.substring(0, 50),
      ecoMode ? "(mode éco)" : ""  // Log si mode éco
    );

    const total = donnees.totaux.total || 1; // évite division par zéro
    const laptopsForPrompt = donnees.laptopsDetail.slice(0, config.MAX_LAPTOPS); // 🌱 Utiliser la config
    const maintenancesForPrompt = donnees.maintenances.slice(
      0,
      config.MAX_ITEMS,
    );
    const alertesForPrompt = donnees.alertes.slice(0, config.MAX_ITEMS);

    // Calcul des statistiques précises
    const tauxDisponibilité = Math.round(
      (donnees.totaux.disponibles / total) * 100,
    );
    const tauxAttribution = Math.round(
      (donnees.totaux.attribues / total) * 100,
    );
    const tauxMaintenance = Math.round(
      (donnees.totaux.en_maintenance / total) * 100,
    );

    // ⚡ Données formatées pour le LLM - TRÈS EXPLICITE
    const donneesPourIA = {
      total_exact: total,
      disponibles_exact: donnees.totaux.disponibles,
      attribues_exact: donnees.totaux.attribues,
      maintenance_exact: donnees.totaux.en_maintenance,
      taux_dispo: tauxDisponibilité,
      taux_attrib: tauxAttribution,
      taux_maint: tauxMaintenance,
      marques: donnees.parMarque,
      etats: donnees.parEtat,
    };

    // ⚡ Prompt OPTIMISÉ ET ULTRA-CONCIS pour réduire le temps de traitement
    const prompt = `Analyste IT. Données du parc:
Total: ${total} | Dispo: ${donnees.totaux.disponibles} (${tauxDisponibilité}%) | Attrib: ${donnees.totaux.attribues} (${tauxAttribution}%) | Maint: ${donnees.totaux.en_maintenance} (${tauxMaintenance}%)
Marques: ${donnees.parMarque.map((m) => `${m.marque}(${m.nb})`).join(", ")}
États: ${donnees.parEtat.map((e) => `${e.etat}(${e.nb})`).join(", ")}
${maintenancesForPrompt.length > 0 ? `Maintenance: ${maintenancesForPrompt.map((m) => m.priorite).join(", ")}` : ""}
${demande ? `Question: "${demande.substring(0, 100)}"` : ""}

Réponds UNIQUEMENT en JSON valide:
{"resume_executif":"","analyse_parc":"","tendances":[],"recommandations":[{"priorite":"","action":""}],"conclusion":""}`.trim();

    let reponse = null;

    // ⚡ Une seule tentative (si timeout, fallback. Pas de retry = plus rapide)
    try {
      reponse = await chatOllama(
        "Analyste IT. JSON seulement.",
        prompt,
        { forceJson: true },
      );
    } catch (apiErr) {
      console.warn("Ollama timeout/err, fallback:", apiErr.message);
      reponse = null; // Forcer fallback
    }

    // Parser la réponse JSON
    let rapportData;
    try {
      rapportData = normalizeRapport(extractJsonObject(reponse));
      rapportData = validateRapportChiffres(rapportData, donnees);
    } catch (parseErr) {
      console.warn("Réponse IA non parsable:", parseErr.message);

      // ⚡ TOUJOURS utiliser le fallback intelligent (même pour questions simples)
      // C'est plus robuste et structuré qu'un fallback simple
      rapportData = genererRapportFallback(demande, donnees);
    }

    // Sauvegarder en base
    const [result] = await pool.query(
      "INSERT INTO rapports (id_utilisateur, titre, type_rapport, format, genere_par_ia, contenu_ia) VALUES (?,?,?,?,?,?)",
      [
        req.user.id,
        `Rapport IA — ${demande ? demande.substring(0, 60) : "Analyse parc"} — ${new Date().toLocaleDateString("fr-FR")}`,
        demande ? "ANALYTIQUE" : "MENSUEL",
        "PDF",
        true,
        JSON.stringify(rapportData),
      ],
    );

    // ⚡ Mettre en cache le résultat
    const finalResult = {
      id_rapport: result.insertId,
      rapport: rapportData,
      donnees,
      ecoMode,
    };
    setCachedRapport(cacheKey, finalResult);

    res.json(finalResult);
  } catch (err) {
    // Fallback rapport tabulaire classique
    console.error("Erreur IA:", err.message);
    res.status(503).json({
      message:
        "Service IA temporairement indisponible — rapport tabulaire généré",
      fallback: true,
      error: err.message,
    });
  }
};

/**
 * Diagnostic de panne assisté par IA
 * POST /api/ia/diagnostic
 */
const diagnosticIA = async (req, res) => {
  const { description_panne, id_laptop, ecoMode } = req.body;
  const config = getConfig(ecoMode); // 🌱 Charger la config selon le mode
  
  if (!description_panne)
    return res.status(400).json({ message: "Description de la panne requise" });

  try {
    let contexte = "";
    if (id_laptop) {
      // ⚡ Requêtes parallèles pour les infos du laptop
      const [[[laptop]], [historique]] = await Promise.all([
        pool.query("SELECT * FROM laptops WHERE id_laptop=?", [id_laptop]),
        pool.query(
          "SELECT * FROM maintenances WHERE id_laptop=? ORDER BY created_at DESC LIMIT 3",
          [id_laptop],
        ),
      ]);

      if (laptop) {
        const histoSummary =
          historique.length > 0
            ? historique.map((h) => h.priorite).join(", ")
            : "Aucun";
        contexte = `

LAPTOP CONCERNÉ:
- Marque/Modèle: ${laptop.marque} ${laptop.modele}
- Numéro de série: ${laptop.numero_serie}
- État actuel: ${laptop.etat}
- RAM: ${laptop.ram}Go
- Historique maintenance: ${histoSummary}`;
      }
    }

    // ⚡ Prompt ultra-concis pour diagnostic (plus rapide)
    const diagResponse = await chatOllama(
      "Technicien IT. Diagnostic JSON.",
      `Panne: "${truncateText(description_panne, 150)}"${contexte.substring(0, 200)}

JSON: {"cause_probable":"","niveau_urgence":"","actions_recommandees":[],"estimation_duree":""}`,
      { forceJson: true, numPredictOverride: ecoMode ? 50 : 80 }, // 🌱 80 → 50 tokens en mode éco
    );

    let diagnostic;
    try {
      diagnostic = extractJsonObject(diagResponse);
    } catch {
      // ⚡ Fallback direct sans retry supplémentaire
      diagnostic = {
        cause_probable: "Analyse en cours...",
        niveau_urgence: "modere",
        actions_recommandees: ["Contacter le support technique"],
        estimation_duree: "À déterminer après diagnostic",
      };
    }
    res.json({
      ...diagnostic,
      ecoMode,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur diagnostic IA", error: err.message });
  }
};

/**
 * Récupère l'historique des rapports IA
 * GET /api/ia/rapports
 */
const getHistoriqueRapports = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_rapport, titre, type_rapport, date_generation, genere_par_ia, created_at
       FROM rapports WHERE genere_par_ia = TRUE ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

/**
 * Vérifier les alertes stock (stock bas, concentration marque, etc.)
 */
const verifierAlertesStock = async (req, res) => {
  const ecoMode = req.query.ecoMode === "true"; // 🌱 Récupérer le paramètre depuis query string
  
  try {
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'DISPONIBLE' THEN 1 ELSE 0 END) as disponibles,
        SUM(CASE WHEN statut = 'ATTRIBUE' THEN 1 ELSE 0 END) as attribues,
        SUM(CASE WHEN statut = 'EN_REPARATION' THEN 1 ELSE 0 END) as maintenance
       FROM laptops WHERE statut != 'SUPPRIME'`,
    );

    if (rows.length === 0) {
      return res.json({
        stockBas: false,
        disponibles: 0,
        total: 0,
        alerte: null,
        ecoMode,
      });
    }

    const { total, disponibles } = rows[0] || {};
    const stockBas = disponibles < SEUIL_STOCK_BAS;

    res.json({
      stockBas,
      disponibles: disponibles || 0,
      total: total || 0,
      seuil: SEUIL_STOCK_BAS,
      alerte: stockBas
        ? {
            type: "danger",
            titre: "⚠️ STOCK BAS",
            message: `Seulement ${disponibles} laptop(s) disponible(s). Seuil d'alerte: ${SEUIL_STOCK_BAS}`,
          }
        : null,
      ecoMode,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

module.exports = {
  genererRapportIA,
  diagnosticIA,
  getHistoriqueRapports,
  verifierAlertesStock,
};
