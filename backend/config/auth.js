/**
 * Configuration JWT/Auth
 * Exporte les variables de sécurité depuis .env
 */

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "laptopstock_secret_key_2025",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
};
