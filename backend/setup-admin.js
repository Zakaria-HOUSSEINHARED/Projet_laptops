const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
require("dotenv").config();
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function setupAdminUser() {
  console.log("\n🔐 Configuration du compte administrateur\n");

  const email = await question("📧 Email (ex: admin@company.com): ");
  const password = await question("🔑 Mot de passe (minimum 8 caractères): ");
  const nom = await question("👤 Nom: ");
  const prenom = await question("👤 Prénom: ");
  const departement = await question("🏢 Département (ex: IT): ");

  if (!email || !password || password.length < 8) {
    console.log("❌ Erreur: Remplissez tous les champs correctement");
    rl.close();
    return;
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "laptopstock_db",
  });

  try {
    const connection = await pool.getConnection();

    // Vérifier si admin existe
    const [existing] = await connection.query(
      "SELECT * FROM utilisateurs WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log("❌ Cet email existe déjà");
      connection.release();
      pool.end();
      rl.close();
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, departement)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, hashedPassword, "ADMINISTRATEUR", departement]
    );

    console.log("\n✅ Compte administrateur créé avec succès!");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Mot de passe: ${password}`);
    console.log("\n💡 Donnez ces identifiants au client pour sa première connexion.\n");

    connection.release();
    pool.end();
    rl.close();
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    pool.end();
    rl.close();
  }
}

setupAdminUser();
