const { pool } = require('../config/db');

/**
 * Récupère tous les utilisateurs
 * GET /api/utilisateurs
 */
const getAllUtilisateurs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_utilisateur, nom, prenom, email, role FROM utilisateurs ORDER BY nom, prenom'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

module.exports = { getAllUtilisateurs };
