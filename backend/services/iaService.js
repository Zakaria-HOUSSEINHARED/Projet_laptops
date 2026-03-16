const { pool } = require("../config/db");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

/**
 * Appel au LLM local via Ollama
 */
const chatOllama = async (system, userMessage) => {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });
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
  const [[totaux]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(statut='DISPONIBLE')    AS disponibles,
      SUM(statut='ATTRIBUE')      AS attribues,
      SUM(statut='EN_REPARATION') AS en_maintenance
    FROM laptops
  `);
  const [parMarque] = await pool.query(
    "SELECT marque, COUNT(*) AS nb FROM laptops GROUP BY marque",
  );
  const [parEtat] = await pool.query(
    "SELECT etat, COUNT(*) AS nb FROM laptops GROUP BY etat",
  );

  // Détail complet de chaque laptop
  const [laptopsDetail] = await pool.query(
    "SELECT id_laptop, marque, modele, numero_serie, etat, statut FROM laptops ORDER BY etat",
  );

  // Tickets de maintenance avec nom du laptop
  const [maintenances] = await pool.query(`
    SELECT m.id_maintenance, m.description, m.priorite, m.statut,
           m.technicien, m.date_soumission,
           l.marque, l.modele, l.numero_serie
    FROM maintenances m
    JOIN laptops l ON m.id_laptop = l.id_laptop
    WHERE m.statut IN ('OUVERT','EN_COURS')
    ORDER BY FIELD(m.priorite,'CRITIQUE','HAUTE','MOYENNE','FAIBLE')
  `);

  // Alertes actives avec nom du laptop
  const [alertes] = await pool.query(`
    SELECT a.id_alerte, a.type_alerte, a.message, a.date_creation,
           l.marque, l.modele
    FROM alertes a
    JOIN laptops l ON a.id_laptop = l.id_laptop
    WHERE a.est_lue = FALSE
    ORDER BY a.date_creation DESC
  `);

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
    const donnees = await collecterDonnees();

    const total = donnees.totaux.total || 1; // évite division par zéro
    const prompt = `
RÈGLE ABSOLUE : Utilise UNIQUEMENT les données ci-dessous. N'invente AUCUN fait, AUCUN chiffre, AUCUN nom qui n'est pas dans ces données.

📊 INVENTAIRE GLOBAL :
- Total laptops : ${donnees.totaux.total}
- Disponibles   : ${donnees.totaux.disponibles} (${Math.round((donnees.totaux.disponibles / total) * 100)}%)
- Attribués     : ${donnees.totaux.attribues} (${Math.round((donnees.totaux.attribues / total) * 100)}%)
- En maintenance: ${donnees.totaux.en_maintenance}

📦 RÉPARTITION PAR MARQUE :
${donnees.parMarque.map((m) => `- ${m.marque}: ${m.nb} unité(s)`).join("\n")}

🔧 ÉTAT DU PARC :
${donnees.parEtat.map((e) => `- ${e.etat}: ${e.nb} unité(s)`).join("\n")}

💻 LISTE COMPLÈTE DES LAPTOPS :
${donnees.laptopsDetail.map((l) => `- ${l.marque} ${l.modele} (SN: ${l.numero_serie}) — état: ${l.etat}, statut: ${l.statut}`).join("\n")}

⚠️ TICKETS DE MAINTENANCE OUVERTS (${donnees.maintenances.length}) :
${donnees.maintenances.length === 0 ? "- Aucun ticket ouvert" : donnees.maintenances.map((m) => `- [${m.priorite}] ${m.marque} ${m.modele} (${m.numero_serie}): "${m.description}" | Statut: ${m.statut} | Technicien: ${m.technicien || "Non assigné"}`).join("\n")}

🔔 ALERTES ACTIVES (${donnees.alertes.length}) :
${donnees.alertes.length === 0 ? "- Aucune alerte active" : donnees.alertes.map((a) => `- [${a.type_alerte}] ${a.marque} ${a.modele}: "${a.message}"`).join("\n")}

📈 MOUVEMENTS 30 DERNIERS JOURS :
${donnees.mouvements30j.length === 0 ? "- Aucun mouvement enregistré" : donnees.mouvements30j.map((m) => `- ${m.type}: ${m.nb} opérations`).join("\n")}

Demande : "${demande || "Génère un rapport mensuel complet pour la direction"}"

Génère un rapport professionnel en JSON avec EXACTEMENT ces champs (toutes les valeurs en français, chaînes de texte uniquement — pas d'objets imbriqués dans les champs texte) :
{
  "resume_executif": "texte court de 2-3 phrases résumant l'état du parc",
  "analyse_parc": "analyse détaillée en texte basée UNIQUEMENT sur les laptops listés ci-dessus",
  "tendances": ["tendance 1 basée sur les données réelles", "tendance 2"],
  "recommandations": [
    { "priorite": "haute", "action": "action concrète basée sur les tickets/alertes réels" }
  ],
  "conclusion": "conclusion courte"
}
Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après, sans markdown.
    `.trim();

    let reponse = null;
    let tentatives = 0;

    // Retry automatique (max 3 fois)
    while (!reponse && tentatives < 3) {
      tentatives++;
      try {
        reponse = await chatOllama(
          "Tu es un expert analyste en gestion de parc informatique. Tu rédiges des rapports professionnels en français. Tu réponds UNIQUEMENT en JSON valide.",
          prompt,
        );
      } catch (apiErr) {
        if (tentatives === 3) throw apiErr;
        await new Promise((r) => setTimeout(r, 1000 * tentatives));
      }
    }

    // Parser la réponse JSON
    let rapportData;
    try {
      const cleaned = reponse.replace(/```json|```/g, "").trim();
      rapportData = JSON.parse(cleaned);
    } catch {
      // Fallback si JSON invalide
      rapportData = {
        resume_executif: reponse,
        analyse_parc: "",
        tendances: [],
        recommandations: [],
        conclusion: "",
      };
    }

    // Sauvegarder en base
    const [result] = await pool.query(
      "INSERT INTO rapports (id_utilisateur, titre, type_rapport, format, genere_par_ia, contenu_ia) VALUES (?,?,?,?,?,?)",
      [
        req.user.id,
        `Rapport IA — ${new Date().toLocaleDateString("fr-FR")}`,
        "MENSUEL",
        "PDF",
        true,
        JSON.stringify(rapportData),
      ],
    );

    res.json({ id_rapport: result.insertId, rapport: rapportData, donnees });
  } catch (err) {
    // Fallback rapport tabulaire classique
    console.error("Erreur Groq API:", err.message);
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
      const [[laptop]] = await pool.query(
        "SELECT * FROM laptops WHERE id_laptop=?",
        [id_laptop],
      );
      const [historique] = await pool.query(
        "SELECT * FROM maintenances WHERE id_laptop=? ORDER BY created_at DESC LIMIT 5",
        [id_laptop],
      );
      if (laptop) {
        contexte = `\nLaptop concerné : ${laptop.marque} ${laptop.modele} (${laptop.numero_serie})
État : ${laptop.etat}, RAM: ${laptop.ram}Go
Historique maintenance : ${historique.length} tickets précédents`;
      }
    }

    const diagResponse = await chatOllama(
      "Tu es un expert technicien informatique. Analyse les pannes de laptops et fournis un diagnostic précis en JSON.",
      `Panne décrite : "${description_panne}"${contexte}

Réponds en JSON avec exactement :
{
  "cause_probable": "...",
  "niveau_urgence": "critique|modere|faible",
  "actions_recommandees": ["...", "..."],
  "estimation_duree": "..."
}`,
    );

    const cleaned = diagResponse.replace(/```json|```/g, "").trim();
    const diagnostic = JSON.parse(cleaned);
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

module.exports = { genererRapportIA, diagnosticIA, getHistoriqueRapports };
