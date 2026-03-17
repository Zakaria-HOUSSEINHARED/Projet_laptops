const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/auth");

/**
 * Connexion d'un utilisateur
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe)
    return res.status(400).json({ message: "Email et mot de passe requis" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM utilisateurs WHERE email = ?",
      [email],
    );
    if (rows.length === 0)
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });

    const user = rows[0];
    if (!user.mot_de_passe) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valid)
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });

    const token = jwt.sign(
      { id: user.id_utilisateur, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    const { mot_de_passe: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

/**
 * Récupère le profil de l'utilisateur connecté
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_utilisateur, nom, prenom, email, role, departement FROM utilisateurs WHERE id_utilisateur = ?",
      [req.user.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

module.exports = { login, getMe };
