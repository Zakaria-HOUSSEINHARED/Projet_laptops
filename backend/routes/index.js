const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Controllers
const { login, getMe }                                  = require('../controllers/authController');
const { getAllLaptops, getLaptopById, createLaptop,
        updateLaptop, deleteLaptop, getStats }           = require('../controllers/laptopController');
const { getAllAttributions, createAttribution, cloturerAttribution,
        getAllMouvements, createMouvement,
        getAllMaintenances, createMaintenance, updateMaintenance,
        getAllAlertes, marquerAlerteLue }                 = require('../controllers/stockController');
const { genererRapportIA, diagnosticIA,
        getHistoriqueRapports }                          = require('../services/iaService');

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────
router.post('/auth/login', login);
router.get ('/auth/me',    authMiddleware, getMe);

// ── Laptops ───────────────────────────────────────────────
router.get   ('/laptops/stats', authMiddleware, getStats);
router.get   ('/laptops',       authMiddleware, getAllLaptops);
router.get   ('/laptops/:id',   authMiddleware, getLaptopById);
router.post  ('/laptops',       authMiddleware, requireRole('ADMINISTRATEUR', 'GESTIONNAIRE'), createLaptop);
router.put   ('/laptops/:id',   authMiddleware, requireRole('ADMINISTRATEUR', 'GESTIONNAIRE'), updateLaptop);
router.delete('/laptops/:id',   authMiddleware, requireRole('ADMINISTRATEUR'), deleteLaptop);

// ── Attributions ──────────────────────────────────────────
router.get ('/attributions',            authMiddleware, getAllAttributions);
router.post('/attributions',            authMiddleware, requireRole('ADMINISTRATEUR','GESTIONNAIRE'), createAttribution);
router.put ('/attributions/:id/cloturer', authMiddleware, requireRole('ADMINISTRATEUR','GESTIONNAIRE'), cloturerAttribution);

// ── Mouvements ────────────────────────────────────────────
router.get ('/mouvements', authMiddleware, getAllMouvements);
router.post('/mouvements', authMiddleware, requireRole('ADMINISTRATEUR','GESTIONNAIRE'), createMouvement);

// ── Maintenances ──────────────────────────────────────────
router.get ('/maintenances',     authMiddleware, getAllMaintenances);
router.post('/maintenances',     authMiddleware, requireRole('ADMINISTRATEUR','GESTIONNAIRE'), createMaintenance);
router.put ('/maintenances/:id', authMiddleware, requireRole('ADMINISTRATEUR','GESTIONNAIRE'), updateMaintenance);

// ── Alertes ───────────────────────────────────────────────
router.get('/alertes',             authMiddleware, getAllAlertes);
router.put('/alertes/:id/lire',    authMiddleware, marquerAlerteLue);

// ── IA / Claude API ───────────────────────────────────────
router.post('/ia/rapport',    authMiddleware, requireRole('ADMINISTRATEUR'), genererRapportIA);
router.post('/ia/diagnostic', authMiddleware, requireRole('ADMINISTRATEUR','GESTIONNAIRE'), diagnosticIA);
router.get ('/ia/rapports',   authMiddleware, requireRole('ADMINISTRATEUR'), getHistoriqueRapports);

module.exports = router;
