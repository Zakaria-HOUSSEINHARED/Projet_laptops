const { pool } = require('../config/db');

// ============================================================
// ATTRIBUTIONS
// ============================================================

/**
 * Récupère toutes les attributions
 * GET /api/attributions
 */
const getAllAttributions = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, l.marque, l.modele, l.numero_serie,
              u.nom, u.prenom, u.email
       FROM attributions a
       JOIN laptops      l ON a.id_laptop      = l.id_laptop
       JOIN utilisateurs u ON a.id_utilisateur = u.id_utilisateur
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Attribue un laptop à un utilisateur
 * POST /api/attributions
 */
const createAttribution = async (req, res) => {
  const { id_laptop, id_utilisateur, motif, date_attribution } = req.body;
  if (!id_laptop || !id_utilisateur)
    return res.status(400).json({ message: 'Laptop et utilisateur requis' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Vérifier que le laptop est disponible
    const [[laptop]] = await conn.query(
      "SELECT statut FROM laptops WHERE id_laptop = ?", [id_laptop]
    );
    if (!laptop || laptop.statut !== 'DISPONIBLE')
      return res.status(409).json({ message: 'Laptop non disponible' });

    // Créer l'attribution
    const [result] = await conn.query(
      'INSERT INTO attributions (id_laptop, id_utilisateur, motif, date_attribution) VALUES (?,?,?,?)',
      [id_laptop, id_utilisateur, motif, date_attribution || new Date()]
    );

    // Changer le statut du laptop
    await conn.query("UPDATE laptops SET statut='ATTRIBUE' WHERE id_laptop=?", [id_laptop]);

    // Enregistrer le mouvement
    await conn.query(
      "INSERT INTO mouvements (id_laptop, type, quantite, description, responsable) VALUES (?,?,?,?,?)",
      [id_laptop, 'SORTIE', 1, `Attribution à l'utilisateur #${id_utilisateur}`, req.user.email]
    );

    await conn.commit();
    res.status(201).json({ id_attribution: result.insertId, message: 'Laptop attribué avec succès' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Clôture une attribution (retour du laptop)
 * PUT /api/attributions/:id/cloturer
 */
const cloturerAttribution = async (req, res) => {
  const { notes_retour } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[attr]] = await conn.query('SELECT * FROM attributions WHERE id_attribution=?', [req.params.id]);
    if (!attr) return res.status(404).json({ message: 'Attribution non trouvée' });

    await conn.query(
      "UPDATE attributions SET statut='CLOTUREE', date_retour=CURDATE(), notes_retour=? WHERE id_attribution=?",
      [notes_retour, req.params.id]
    );

    await conn.query("UPDATE laptops SET statut='DISPONIBLE' WHERE id_laptop=?", [attr.id_laptop]);

    await conn.query(
      "INSERT INTO mouvements (id_laptop, type, quantite, description, responsable) VALUES (?,?,?,?,?)",
      [attr.id_laptop, 'ENTREE', 1, 'Retour après attribution', req.user.email]
    );

    await conn.commit();
    res.json({ message: 'Attribution clôturée avec succès' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

// ============================================================
// MOUVEMENTS
// ============================================================

/**
 * Récupère tous les mouvements de stock
 * GET /api/mouvements
 */
const getAllMouvements = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, l.marque, l.modele, l.numero_serie
       FROM mouvements m
       JOIN laptops l ON m.id_laptop = l.id_laptop
       ORDER BY m.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Crée un mouvement manuel
 * POST /api/mouvements
 */
const createMouvement = async (req, res) => {
  const { id_laptop, type, quantite, description } = req.body;
  if (!id_laptop || !type)
    return res.status(400).json({ message: 'Laptop et type requis' });

  try {
    const [result] = await pool.query(
      'INSERT INTO mouvements (id_laptop, type, quantite, description, responsable) VALUES (?,?,?,?,?)',
      [id_laptop, type, quantite || 1, description, req.user.email]
    );
    res.status(201).json({ id_mouvement: result.insertId, message: 'Mouvement enregistré' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ============================================================
// MAINTENANCES
// ============================================================

/**
 * Récupère tous les tickets de maintenance
 * GET /api/maintenances
 */
const getAllMaintenances = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, l.marque, l.modele, l.numero_serie
       FROM maintenances m
       JOIN laptops l ON m.id_laptop = l.id_laptop
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Crée un ticket de maintenance
 * POST /api/maintenances
 */
const createMaintenance = async (req, res) => {
  const { id_laptop, description, priorite, technicien } = req.body;
  if (!id_laptop || !description)
    return res.status(400).json({ message: 'Laptop et description requis' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO maintenances (id_laptop, description, priorite, technicien) VALUES (?,?,?,?)',
      [id_laptop, description, priorite || 'MOYENNE', technicien]
    );
    await conn.query("UPDATE laptops SET statut='EN_REPARATION' WHERE id_laptop=?", [id_laptop]);
    await conn.commit();
    res.status(201).json({ id_maintenance: result.insertId, message: 'Ticket créé avec succès' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Met à jour le statut d'une maintenance
 * PUT /api/maintenances/:id
 */
const updateMaintenance = async (req, res) => {
  const { statut, technicien, date_resolution } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE maintenances SET statut=?, technicien=?, date_resolution=? WHERE id_maintenance=?',
      [statut, technicien, date_resolution, req.params.id]
    );
    // Si résolu, remettre le laptop disponible
    if (statut === 'RESOLU' || statut === 'FERME') {
      const [[maint]] = await conn.query('SELECT id_laptop FROM maintenances WHERE id_maintenance=?', [req.params.id]);
      if (maint) await conn.query("UPDATE laptops SET statut='DISPONIBLE' WHERE id_laptop=?", [maint.id_laptop]);
    }
    await conn.commit();
    res.json({ message: 'Maintenance mise à jour avec succès' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

// ============================================================
// ALERTES
// ============================================================

/**
 * Récupère les alertes non lues
 * GET /api/alertes
 */
const getAllAlertes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, l.marque, l.modele FROM alertes a
       JOIN laptops l ON a.id_laptop = l.id_laptop
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Marque une alerte comme lue
 * PUT /api/alertes/:id/lire
 */
const marquerAlerteLue = async (req, res) => {
  try {
    await pool.query('UPDATE alertes SET est_lue=TRUE WHERE id_alerte=?', [req.params.id]);
    res.json({ message: 'Alerte marquée comme lue' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

module.exports = {
  getAllAttributions, createAttribution, cloturerAttribution,
  getAllMouvements, createMouvement,
  getAllMaintenances, createMaintenance, updateMaintenance,
  getAllAlertes, marquerAlerteLue
};
