const { pool } = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 10000); // REVENIR À 10s
const OLLAMA_TEMPERATURE = Number(process.env.OLLAMA_TEMPERATURE || 0.05); // REVENIR À 0.05
const OLLAMA_NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT || 150); // BACK TO 150
const OLLAMA_TOP_P = Number(process.env.OLLAMA_TOP_P || 0.8);
const OLLAMA_REPEAT_PENALTY = Number(process.env.OLLAMA_REPEAT_PENALTY || 1.0);
const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX || 400);
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "5m";
const OLLAMA_MAX_LAPTOPS = Number(process.env.OLLAMA_MAX_LAPTOPS || 6); // ⚡ 8 → 6
const OLLAMA_MAX_ITEMS = Number(process.env.OLLAMA_MAX_ITEMS || 2); // ⚡ 3 → 2
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
  const { demande } = req.body;

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
      });
    }

    // ⚡ QUESTION COMPLEXE: utiliser LLM ou fallback intelligent
    console.log(
      "🤖 Question complexe détectée, passage par LLM...",
      demande?.substring(0, 50),
    );

    const total = donnees.totaux.total || 1; // évite division par zéro
    const laptopsForPrompt = donnees.laptopsDetail.slice(0, OLLAMA_MAX_LAPTOPS);
    const maintenancesForPrompt = donnees.maintenances.slice(
      0,
      OLLAMA_MAX_ITEMS,
    );
    const alertesForPrompt = donnees.alertes.slice(0, OLLAMA_MAX_ITEMS);

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

    // ⚡ Prompt HYPER-STRICT avec QUESTION PERSONNALISÉE
    const sectionQuestion = demande
      ? `\n\n🎯 QUESTION SPÉCIFIQUE DE L'UTILISATEUR:\n"${demande}"\n\n⚡ RÉPONDS DIRECTEMENT ET PRÉCISÉMENT à cette question en utilisant les données ci-dessous.`
      : "";

    const prompt = `⚠️ DIRECTIVE STRICTE ⚠️

Tu DOIS utiliser EXACTEMENT ces chiffres ci-dessous. PAS D'EXCEPTIONS.
Si tu inventes ou changes un chiffre, tu violeras cette directive.${sectionQuestion}

=== CHIFFRES OBLIGATOIRES À UTILISER ==="
TOTAL EXACT: ${total} ordinateurs portables
DISPONIBLES EXACT: ${donnees.totaux.disponibles} (${tauxDisponibilité}%)
ATTRIBUÉS EXACT: ${donnees.totaux.attribues} (${tauxAttribution}%)
MAINTENANCE EXACT: ${donnees.totaux.en_maintenance} (${tauxMaintenance}%)

=== DISTRIBUTION PAR MARQUE (OBLIGATOIRE) ===
${donnees.parMarque.map((m) => `${m.marque}: exactement ${m.nb} unité(s)`).join("\n")}

=== DISTRIBUTION PAR ÉTAT (OBLIGATOIRE) ===
${donnees.parEtat.map((e) => `${e.etat}: exactement ${e.nb} unité(s)`).join("\n")}

=== DÉTAIL DES LAPTOPS (top ${OLLAMA_MAX_LAPTOPS}) ===
${laptopsForPrompt.length > 0 ? laptopsForPrompt.map((l) => `• ${l.marque} ${l.modele} | État: ${l.etat} | Statut: ${l.statut}`).join("\n") : "Aucun laptop dans la base"}

=== TICKETS DE MAINTENANCE OUVERTS (top ${OLLAMA_MAX_ITEMS}) ===
${maintenancesForPrompt.length > 0 ? maintenancesForPrompt.map((m) => `• [${m.priorite}] ${m.marque} ${m.modele} | ${truncateText(m.description, 80)}`).join("\n") : "Aucun ticket ouvert"}

=== ALERTES ACTIVES (top ${OLLAMA_MAX_ITEMS}) ===
${alertesForPrompt.length > 0 ? alertesForPrompt.map((a) => `• [${a.type_alerte}] ${a.marque} ${a.modele}: ${truncateText(a.message, 80)}`).join("\n") : "Aucune alerte"}

=== INSTRUCTIONS ABSOLUES ===
1. ✅ ${demande ? "RÉPONDS À LA QUESTION spécifique posée" : "TOUJOURS commencer par: 'Parc de [TOTAL] ordinateurs portables'"}
2. ✅ TOUJOURS utiliser les chiffres EXACTS ci-dessus
3. ✅ JAMAIS inventer de chiffres qui ne sont pas ci-dessus
4. ✅ Répondre UNIQUEMENT en JSON valide

=== JSON REQUIS ===
{
  "resume_executif": "${demande ? "Réponse DIRECTE à la question, puis chiffres clés" : "Parc de " + total + " laptops"}",
  "analyse_parc": "Détail basé sur les données réelles",
  "tendances": ["Observation basée sur les données"],
  "recommandations": [{"priorite": "haute", "action": "Action concrète"}],
  "conclusion": "Conclusion adaptée à la question"
}

Réponds UNIQUEMENT avec ce JSON, rien d'autre.`.trim();

    let reponse = null;
    let tentatives = 0;

    // Retry automatique (max 2 fois au lieu de 3)
    while (!reponse && tentatives < 2) {
      tentatives++;
      try {
        reponse = await chatOllama(
          "Tu es un analyste IT. Réponds UNIQUEMENT en JSON valide.",
          prompt,
          { forceJson: true },
        );
      } catch (apiErr) {
        if (tentatives === 2) throw apiErr;
        await new Promise((r) => setTimeout(r, 500 * tentatives));
      }
    }

    // Parser la réponse JSON
    let rapportData;
    try {
      rapportData = normalizeRapport(extractJsonObject(reponse));
      rapportData = validateRapportChiffres(rapportData, donnees);
    } catch (parseErr) {
      console.warn("Réponse IA non parsable:", parseErr.message);

      // ⚡ Utiliser le fallback intelligent pour les questions complexes
      if (questionEstComplexe) {
        rapportData = genererRapportFallback(demande, donnees);
      } else {
        // Fallback simple pour les autres cas
        rapportData = {
          resume_executif: `${demande ? `Réponse: ${demande.substring(0, 80)}` : "Parc informatique"}. ${donnees.totaux.disponibles} dispo., ${donnees.totaux.attribues} attrib., ${donnees.totaux.en_maintenance} maintenance.`,
          analyse_parc: `Distribution: ${donnees.parMarque.map((m) => `${m.marque} (${m.nb})`).join(", ")}. État: ${donnees.parEtat.map((e) => `${e.etat} (${e.nb})`).join(", ")}.`,
          tendances: ["État du parc analysé"],
          recommandations:
            donnees.maintenances.length > 0
              ? [
                  {
                    priorite: "haute",
                    action: `${donnees.maintenances.length} ticket(s) de maintenance à traiter.`,
                  },
                ]
              : [],
          conclusion: "Rapport généré à partir des données actuelles.",
        };
      }
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
  const { description_panne, id_laptop } = req.body;
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

    // ⚡ Prompt amélioré pour diagnostic
    const diagResponse = await chatOllama(
      "Tu es un expert technicien IT. Tu diagnostiques les pannes en te basant sur la description fournie et l'historique disponible. Ta réponse doit être concise, factuelle et actionnable. Réponds UNIQUEMENT en JSON valide, sans texte supplémentaire.",
      `ANALYSE DE PANNE REQUISE:

Panne décrite: "${truncateText(description_panne, 300)}"
${contexte}

INSTRUCTIONS:
1. Basez le diagnostic sur la description de la panne et l'historique fourni
2. Évaluez l'urgence réaliste de la situation
3. Proposez des actions concrètes et testables
4. Estimez un délai réaliste (en heures ou jours)
5. Répondez UNIQUEMENT en JSON valide

FORMAT REQUIS (exemple):
{
  "cause_probable": "Batterie défaillante - décharge rapide anormale",
  "niveau_urgence": "moderé",
  "actions_recommandees": [
    "Tester la batterie avec diagnostic logiciel",
    "Remplacer si défaillance confirmée"
  ],
  "estimation_duree": "2-3 heures pour diagnostic + remplacement"
}

Réponds UNIQUEMENT avec du JSON valide.`,
      { forceJson: true, numPredictOverride: 200 }, // ⚡ Légèrement plus pour qualité
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
    res.json(diagnostic);
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
