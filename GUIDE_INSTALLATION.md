# 📥 Guide d'Installation Complet — LaptopStock Manager

## ⏱️ Durée totale : 15-20 minutes

---

## 🔧 Prérequis

Avant de commencer, vérifie que tu as installé :

| Outil       | Version      | Vérifier           |
| ----------- | ------------ | ------------------ |
| **Git**     | Latest       | `git --version`    |
| **Node.js** | 18.x minimum | `node --version`   |
| **npm**     | 9.x minimum  | `npm --version`    |
| **MySQL**   | 8.0+         | `mysql --version`  |
| **Ollama**  | Latest       | `ollama --version` |

---

## 📋 5 Étapes d'Installation

### ✅ **Étape 1 : Cloner le Projet (1 min)**

```bash
# Cloner le dépôt GitHub
git clone https://github.com/Zakaria-HOUSSEINHARED/Projet_laptops.git

# Accéder au dossier
cd Projet_laptops
```

> **Note :** Si tu as déjà le projet, passe à l'étape 2.

---

### ✅ **Étape 2 : Configuration MySQL (3 min)**

```bash
# Créer la base de données + tables
mysql -u root -p < database.sql

# Vérifier la création
mysql -u root -p
> USE laptopstock_db;
> SHOW TABLES;
> EXIT;
```

**Attendu :** 7 tables (utilisateurs, laptops, attributions, mouvements, maintenances, alertes, rapports)

---

### ✅ **Étape 3 : Installation Backend (5 min)**

```bash
# Accéder au dossier backend
cd backend

# Installer les dépendances
npm install

# Créer le fichier .env depuis le template
cp .env.example .env

# Éditer .env avec tes paramètres (voir section .env ci-dessous)
# nano .env    (ou editor de ton choix)

# 🔐 CRÉER UN COMPTE ADMINISTRATEUR (interactive)
node setup-admin.js
# Réponds aux questions:
# Email (ex: admin@company.com): admin@mycompany.com
# Mot de passe (min 8 caractères): YourSecurePass123!
# Nom: Admin
# Prénom: User
# Département: IT
# ✅ Compte créé avec succès!

# Tester le backend
npm run dev
```

**Attendu :** Message `Server running on http://localhost:5000`

---

### ✅ **Étape 4 : Installation Frontend (5 min)**

Depuis un **AUTRE terminal** (garder le backend actif) :

```bash
# Depuis la racine du projet
cd frontend

# Installer les dépendances
npm install

# Lancer le frontend
npm start
```

**Attendu :** Navigateur s'ouvre sur `http://localhost:3000`

---

### ✅ **Étape 5 : Configuration Ollama (3 min)**

Dans un **TROISIÈME terminal** :

```bash
# Vérifier que Ollama est installé
ollama --version

# Télécharger le modèle LLM (une fois)
ollama pull llama3.2:1b

# Démarrer le serveur Ollama
ollama serve
```

**Attendu :** `Listening on 127.0.0.1:11434`

---

## ⚙️ Configuration `.env` (Backend)

Crée/édite `backend/.env` avec :

```env
# ============================================================
# SERVEUR
# ============================================================
PORT=5000
NODE_ENV=development

# ============================================================
# BASE DE DONNÉES MySQL
# ============================================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=           # Ton mot de passe MySQL (vide si pas de pwd)
DB_NAME=laptopstock_db

# ============================================================
# AUTHENTIFICATION
# ============================================================
JWT_SECRET=laptopstock_secret_key_2025
JWT_EXPIRES_IN=24h

# ============================================================
# FRONTEND
# ============================================================
FRONTEND_URL=http://localhost:3000

# ============================================================
# OLLAMA LLM (LOCAL)
# ============================================================
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# ============================================================
# OPTIMISATIONS IA
# ============================================================
AI_TIMEOUT_MS=2500              # Timeout LLM (ms)
AI_TEMPERATURE=0.3              # Déterminisme (0=strict, 1=créatif)
AI_MAX_TOKENS=40                # Longueur réponse
OLLAMA_TOP_P=0.7                # Diversité
OLLAMA_NUM_CTX=256              # Contexte window
OLLAMA_KEEP_ALIVE=5m            # Garde modèle en mémoire
```

---

## 🧪 Vérification de l'Installation

### 1️⃣ Backend OK ?

```bash
curl http://localhost:5000/api/auth/me
# Attendu: Erreur 401 (pas de token) = OK ✅
```

### 2️⃣ Frontend OK ?

```
http://localhost:3000
# Attendu: Page Login s'affiche = OK ✅
```

### 3️⃣ MySQL OK ?

```bash
mysql -u root -p laptopstock_db
> SELECT COUNT(*) FROM laptops;
# Attendu: 0 (BD vide) = OK ✅
```

### 4️⃣ Ollama OK ?

```bash
curl http://localhost:11434/api/tags
# Attendu: JSON avec llama3.2:1b = OK ✅
```

---

## 🚀 Premier Démarrage

### Créer un compte Admin

1. Ouvre `http://localhost:3000`
2. Clique "Register"
3. Remplis le formulaire avec :
   - Email: `admin@company.com`
   - Password: `Admin123!`
4. Clique "Register"

### Se connecter

1. Login avec tes identifiants
2. Vas à **Dashboard** pour voir les stats
3. Vas à **AI Insights** pour tester le LLM

---

## 📱 Tester les Fonctionnalités

| Fonctionnalité      | Étapes                                      | Résultat Attendu               |
| ------------------- | ------------------------------------------- | ------------------------------ |
| **Dashboard**       | Login → Dashboard                           | Stats + graphiques s'affichent |
| **Gestion Laptops** | Dashboard → Laptops                         | Page avec tableau vide         |
| **Rapport IA**      | Dashboard → AI Insights → "Générer rapport" | Rapport en 2-3s ⚡             |
| **Responsive**      | Redimensionner navigateur < 768px           | Menu hamburger apparaît        |

---

## 🐛 Troubleshooting

### ❌ "Connection refused" sur Backend (port 5000)

```bash
# Vérifier si le port est occupé
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Libérer le port
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows

# Réessayer
npm run dev
```

### ❌ "Cannot find module" npm

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### ❌ Ollama ne répond pas

```bash
# Vérifier que le service est lancé
ollama serve

# Vérifier le modèle
ollama list

# Si manquant, télécharger
ollama pull llama3.2:1b
```

### ❌ MySQL: "Access denied"

```bash
# Vérifie les credentials dans .env
# Ils doivent correspondre à ton installation MySQL

# Test de connexion
mysql -u root -p
# Rentre ton mot de passe
```

---

## 📚 Fichiers Importants

```
Projet_laptops/
├── backend/
│   ├── .env.example          → Copie ici dans .env
│   ├── services/iaService.js → Logique LLM (800 lignes)
│   ├── server.js             → API Express
│   └── package.json          → Dépendances Node
│
├── frontend/
│   ├── src/pages/            → Pages React
│   ├── src/components/       → Composants réutilisables
│   └── package.json          → Dépendances React
│
├── database.sql              → Schéma MySQL
└── README.md                 → Info projet
```

---

## 🎯 Étapes Suivantes (Optionnel)

### 1. Charger des données de test

```bash
# Dans backend, créer des laptops test
npm run seed-db  # Si disponible
# Ou manuellement via UI → Dashboard → Add Laptop
```

### 2. Générer des rapports IA

```
Dashboard → AI Insights → Tapez question
Exemple: "Quel est l'état du stock?"
```

### 3. Mode Éco-Conception

```
Dashboard → Toggle "🌱 ECO MODE"
Rapports IA seront générés en 1.8s au lieu de 3.2s
```

---

## 📞 Support

Si tu as des problèmes :

1. Vérifie que tous les services tournent (backend, frontend, MySQL, Ollama)
2. Regarde les logs du terminal
3. Recompile si nécessaire : `npm install && npm run dev`
4. Consulte `GUIDE_LLM_FONCTIONNEMENT.md` pour détails sur le LLM

---

**Installation complète ? ✅ Bienvenue dans LaptopStock Manager !** 🚀
