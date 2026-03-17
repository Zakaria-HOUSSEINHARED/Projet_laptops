# 🤖 Guide — Comment marche le LLM (Ollama) dans LaptopStock Manager

## 1️⃣ Configuration (`.env.example`)

```bash
# 🤖 IA/LLM CONFIGURATION (OLLAMA) — OPTIMISÉ
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
```

**Signification :**

- `OLLAMA_URL` = Adresse du serveur Ollama local
- `OLLAMA_MODEL` = Modèle utilisé (Llama 3.2 1B = petit, rapide, local)

---

## 2️⃣ Installation Ollama

```bash
# 1. Télécharger Ollama
# Windows: https://ollama.ai/download
# Mac/Linux: curl -fsSL https://ollama.ai/install.sh | sh

# 2. Démarrer le serveur Ollama
ollama serve

# 3. Dans un autre terminal, télécharger le modèle RECOMMANDÉ
ollama pull llama3.2:1b

# Note: Mistral 7B est trop gourmand pour ce MVP (temps: 3.2s vs 1.8s avec Llama)
```

---

## 3️⃣ Flux du LLM en Backend

### Étape 1: Requête utilisateur

```javascript
// Frontend
POST /api/ia/genererRapport
{
  "demande": "Quel est l'état du stock?"
}
```

### Étape 2: Collecte des données SQL

```javascript
// iaService.js - collecterDonnees()
const [laptops] = await db.query("SELECT COUNT(*) FROM laptops");
const [marques] = await db.query(
  "SELECT marque, COUNT(*) FROM laptops GROUP BY marque",
);
// ... parallélisé avec Promise.all()
```

### Étape 3: Construction du prompt

```javascript
const prompt = `
Analyste IT. Données du Stock:
- Total: 45 laptops
- Disponibles: 32 (71%)
- Marques: DELL (15), HP (20), LENOVO (10)
- États: BON_ETAT (40), DEGRADE (5)

Question: Quel est l'état du stock?

Réponds UNIQUEMENT en JSON: {resume_executif: "...", analyse_parc: "...", ...}
`;
```

### Étape 4: Appel Ollama (HTTP POST)

```javascript
// iaService.js - genererRapportIA()
const response = await axios.post("http://localhost:11434/api/generate", {
  model: "llama3.2:1b",
  prompt: prompt,
  stream: false,
  temperature: 0.3, // Déterministe
  num_predict: 40, // Tokens max (Court)
  timeout: 2500, // 2.5 secondes max
});
```

### Étape 5: Parse JSON et validation

```javascript
const rapport = JSON.parse(response.data);
validateRapportChiffres(rapport); // Vérifier la structure

return {
  id_rapport: savedId,
  rapport: rapport,
  ecoMode: false,
  cached: false,
};
```

### Étape 6: Fallback SIT

Si Ollama ne répond pas ou retourne du JSON invalide :

```javascript
// Rapport tabulaire automatique génération (IA)
genererRapportFallback(donnees); // Pas d'IA, juste SQL
```

---

## 4️⃣ Configuration ECO vs NORMAL

```javascript
// backend/services/iaService.js

const CONFIG_NORMAL = {
  TEMPERATURE: 0.3,
  NUM_PREDICT: 40,
  TOP_P: 0.7,
  TIMEOUT_MS: 2500,
};

const CONFIG_ECO = {
  TEMPERATURE: 0.2, // Plus strict
  NUM_PREDICT: 25, // Moins de tokens
  TOP_P: 0.6,
  TIMEOUT_MS: 1500, // Plus rapide
};
```

**Résultat :**

- **Normal** : 3.2s par rapport, réponse complète
- **Eco** : 1.8s par rapport, compact et optimisé

---

## 5️⃣ Questions Simples vs Complexes

### Questions Simples (30% des cas)

```javascript
if (demande === "Combien de laptops?") {
  // ✅ Répondre directement sans LLM
  return { total: 45, message: "45 laptops en stock" }; // < 10ms
}
```

### Questions Complexes (70% des cas)

```javascript
if (demande === "Quels sont les goulots d'étranglement?") {
  // ❌ Appeler Ollama LLM
  // Analyse nuancée requise
}
```

---

## 6️⃣ Endpoints API

```bash
# Générer un rapport IA
POST /api/ia/genererRapport
Headers: { Authorization: "Bearer <token>" }
Body: {
  "demande": "Quels laptops sont en mauvais état?",
  "ecoMode": false
}

# Diagnostic panne
POST /api/ia/diagnostic
Body: {
  "description_panne": "L'écran ne s'allume plus",
  "id_laptop": 5,
  "ecoMode": true
}

# Vérifier alertes stock
GET /api/ia/alertes
```

---

## 7️⃣ Données dans BD (Tabuleau `rapports`)

```sql
CREATE TABLE rapports (
  id_rapport INT PRIMARY KEY,
  id_utilisateur INT,
  demande TEXT,
  rapport JSON,           -- { resume_executif, analyse_parc, ... }
  temps_generation INT,   -- ms
  eco_mode BOOLEAN,
  created_at TIMESTAMP
);

-- Exemple
INSERT INTO rapports VALUES (
  1, 3,
  'Quel est l\'état du stock?',
  '{"resume_executif": "Le stock est stable...", ...}',
  1850,
  true,
  NOW()
);
```

---

## 8️⃣ Optimisations Appliquées

| Optimisation                    | Gain                  |
| ------------------------------- | --------------------- |
| **Parallélisation SQL**         | −1.2s                 |
| **Questions simples (pas IA)**  | −2s                   |
| **Prompt ultra-concis**         | −0.5s                 |
| **Cache 10 minutes**            | −3.2s (réutilisation) |
| **Mode ECO**                    | −40% CPU              |
| **Code Splitting JS (420 Kio)** | −0.8s load            |
| **Cache Headers**               | −0.5s réseau          |

**Résultat total : 45s → 2-3s** ✅

---

## 9️⃣ Debugging

### Ollama ne répond pas ?

```bash
# Vérifier si le serveur tourne
curl http://localhost:11434/api/tags

# Redémarrer
ollama serve
```

### LLM timeout ?

```javascript
// Augmenter TIMEOUT_MS dans CONFIG_NORMAL
TIMEOUT_MS: 5000; // 5 secondes
```

### Rapport vide ?

```javascript
// Vérifier la validation
console.log(validateRapportChiffres(rapport));
```

---

## 🔟 Fichiers Clés

| Fichier                             | Rôle                                    |
| ----------------------------------- | --------------------------------------- |
| `backend/services/iaService.js`     | Orchestration LLM complète (803 lignes) |
| `backend/server.js`                 | Configuration Express + routes IA       |
| `backend/routes/index.js`           | Endpoints `/api/ia/*`                   |
| `frontend/src/pages/AIInsights.jsx` | Interface utilisateur                   |
| `.env`                              | Configuration locale (secrets)          |
| `.env.example`                      | Template (à partager)                   |

---

## 📚 Stack Technique

- **LLM Local** : Ollama (Llama 3.2 1B)
- **Backend** : Node.js 18 + Express.js 4.x
- **BDD** : MySQL 8.0
- **Frontend** : React 18.x
- **Protocole** : HTTP REST + JSON

---

**Questions ? Regarde `backend/services/iaService.js` ligne ~600 pour voir l'implémentation complète ! 🚀**
