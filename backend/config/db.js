const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Pool de connexions MySQL pour LaptopStock Manager
 * Utilise mysql2/promise pour les requêtes async/await
 */
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'laptopstock_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4'
});

/**
 * Teste la connexion à la base de données
 * @returns {Promise<void>}
 */
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connecté avec succès');
    conn.release();
  } catch (error) {
    console.error('❌ Erreur connexion MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
