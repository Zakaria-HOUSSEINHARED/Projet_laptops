const { pool } = require('../config/db');

/**
 * Récupère tous les laptops avec filtres optionnels
 * GET /api/laptops
 */
const getAllLaptops = async (req, res) => {
  const { statut, marque, ram, search } = req.query;
  let query = 'SELECT * FROM laptops WHERE 1=1';
  const params = [];

  if (statut)  { query += ' AND statut = ?';               params.push(statut); }
  if (marque)  { query += ' AND marque = ?';               params.push(marque); }
  if (ram)     { query += ' AND ram = ?';                  params.push(ram); }
  if (search)  { query += ' AND (modele LIKE ? OR marque LIKE ? OR numero_serie LIKE ?)';
                 params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  query += ' ORDER BY created_at DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Récupère un laptop par ID avec son attribution en cours
 * GET /api/laptops/:id
 */
const getLaptopById = async (req, res) => {
  try {
    const [laptop] = await pool.query('SELECT * FROM laptops WHERE id_laptop = ?', [req.params.id]);
    if (laptop.length === 0) return res.status(404).json({ message: 'Laptop non trouvé' });

    const [attribution] = await pool.query(
      `SELECT a.*, u.nom, u.prenom, u.email FROM attributions a
       JOIN utilisateurs u ON a.id_utilisateur = u.id_utilisateur
       WHERE a.id_laptop = ? AND a.statut = 'ACTIVE'`,
      [req.params.id]
    );

    res.json({ ...laptop[0], attribution: attribution[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Crée un nouveau laptop
 * POST /api/laptops
 */
const createLaptop = async (req, res) => {
  const { marque, modele, numero_serie, processeur, ram, stockage, etat, date_achat } = req.body;
  if (!marque || !modele || !numero_serie)
    return res.status(400).json({ message: 'Marque, modèle et numéro de série requis' });

  try {
    // Vérifier unicité du numéro de série
    const [existing] = await pool.query('SELECT id_laptop FROM laptops WHERE numero_serie = ?', [numero_serie]);
    if (existing.length > 0)
      return res.status(409).json({ message: 'Numéro de série déjà existant' });

    const [result] = await pool.query(
      'INSERT INTO laptops (marque, modele, numero_serie, processeur, ram, stockage, etat, date_achat) VALUES (?,?,?,?,?,?,?,?)',
      [marque, modele, numero_serie, processeur, ram, stockage, etat || 'NEUF', date_achat]
    );

    // Enregistrer le mouvement d'entrée
    await pool.query(
      'INSERT INTO mouvements (id_laptop, type, quantite, description, responsable) VALUES (?,?,?,?,?)',
      [result.insertId, 'ENTREE', 1, `Ajout initial du laptop ${modele}`, req.user.email]
    );

    res.status(201).json({ id_laptop: result.insertId, message: 'Laptop créé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Met à jour un laptop
 * PUT /api/laptops/:id
 */
const updateLaptop = async (req, res) => {
  const { marque, modele, processeur, ram, stockage, etat, statut, date_achat } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE laptops SET marque=?, modele=?, processeur=?, ram=?, stockage=?, etat=?, statut=?, date_achat=? WHERE id_laptop=?',
      [marque, modele, processeur, ram, stockage, etat, statut, date_achat, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Laptop non trouvé' });
    res.json({ message: 'Laptop mis à jour avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Supprime un laptop
 * DELETE /api/laptops/:id
 */
const deleteLaptop = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM laptops WHERE id_laptop = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Laptop non trouvé' });
    res.json({ message: 'Laptop supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

/**
 * Statistiques du tableau de bord
 * GET /api/laptops/stats
 */
const getStats = async (req, res) => {
  try {
    const [[total]]       = await pool.query('SELECT COUNT(*) AS total FROM laptops');
    const [[disponibles]] = await pool.query("SELECT COUNT(*) AS total FROM laptops WHERE statut='DISPONIBLE'");
    const [[attribues]]   = await pool.query("SELECT COUNT(*) AS total FROM laptops WHERE statut='ATTRIBUE'");
    const [[maintenance]] = await pool.query("SELECT COUNT(*) AS total FROM laptops WHERE statut='EN_REPARATION'");

    const [parMarque] = await pool.query(
      'SELECT marque, COUNT(*) AS total FROM laptops GROUP BY marque ORDER BY total DESC'
    );
    const [mouvements] = await pool.query(
      `SELECT DATE(date) AS jour, type, COUNT(*) AS total
       FROM mouvements WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY jour, type ORDER BY jour`
    );

    res.json({
      total:       total.total,
      disponibles: disponibles.total,
      attribues:   attribues.total,
      maintenance: maintenance.total,
      parMarque,
      mouvements
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

module.exports = { getAllLaptops, getLaptopById, createLaptop, updateLaptop, deleteLaptop, getStats };
