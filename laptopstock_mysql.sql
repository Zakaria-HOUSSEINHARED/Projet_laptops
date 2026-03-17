-- ============================================================
-- SCRIPT BDD — LaptopStock Manager v2.0
-- Auteurs : Younes HADLI & ARABAT Mohammed
-- Base de données : MySQL
-- Année universitaire : 2025-2026
-- ============================================================

-- Création et sélection de la base de données
CREATE DATABASE IF NOT EXISTS laptopstock_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE laptopstock_db;

-- ============================================================
-- SUPPRESSION DES TABLES (ordre inverse des dépendances)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS alertes;
DROP TABLE IF EXISTS rapports;
DROP TABLE IF EXISTS mouvements;
DROP TABLE IF EXISTS maintenances;
DROP TABLE IF EXISTS attributions;
DROP TABLE IF EXISTS laptops;
DROP TABLE IF EXISTS utilisateurs;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- TABLE : UTILISATEURS
-- ============================================================
CREATE TABLE utilisateurs (
    id_utilisateur      INT             AUTO_INCREMENT PRIMARY KEY,
    nom                 VARCHAR(50)     NOT NULL,
    prenom              VARCHAR(50)     NOT NULL,
    email               VARCHAR(100)    NOT NULL UNIQUE,
    mot_de_passe        VARCHAR(255)    NOT NULL COMMENT 'Hashé avec bcrypt',
    role                ENUM('ADMINISTRATEUR','GESTIONNAIRE','UTILISATEUR') NOT NULL DEFAULT 'UTILISATEUR',
    statut_utilisateur  VARCHAR(100),
    departement         VARCHAR(100),
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Comptes utilisateurs avec gestion des rôles RBAC';

-- ============================================================
-- TABLE : LAPTOPS
-- ============================================================
CREATE TABLE laptops (
    id_laptop           INT             AUTO_INCREMENT PRIMARY KEY,
    marque              VARCHAR(50)     NOT NULL,
    modele              VARCHAR(100)    NOT NULL,
    numero_serie        VARCHAR(100)    NOT NULL UNIQUE COMMENT 'Numéro de série unique — clé métier',
    processeur          VARCHAR(100),
    ram                 INT             COMMENT 'RAM en Go',
    stockage            VARCHAR(100),
    etat                ENUM('NEUF','BON_ETAT','DEGRADE','HORS_SERVICE') NOT NULL DEFAULT 'NEUF',
    statut              ENUM('DISPONIBLE','ATTRIBUE','EN_REPARATION')    NOT NULL DEFAULT 'DISPONIBLE',
    date_achat          DATE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Inventaire central de tous les ordinateurs portables';

-- ============================================================
-- TABLE : ATTRIBUTIONS
-- ============================================================
CREATE TABLE attributions (
    id_attribution      INT             AUTO_INCREMENT PRIMARY KEY,
    id_laptop           INT             NOT NULL,
    id_utilisateur      INT             NOT NULL,
    date_attribution    DATE            NOT NULL DEFAULT (CURRENT_DATE),
    date_retour         DATE,
    motif               VARCHAR(255),
    statut              VARCHAR(50)     NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE ou CLOTUREE',
    notes_retour        TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attr_laptop       FOREIGN KEY (id_laptop)       REFERENCES laptops(id_laptop)           ON DELETE CASCADE,
    CONSTRAINT fk_attr_utilisateur  FOREIGN KEY (id_utilisateur)  REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Affectation d un laptop à un utilisateur pour une période donnée';

-- ============================================================
-- TABLE : MOUVEMENTS
-- ============================================================
CREATE TABLE mouvements (
    id_mouvement        INT             AUTO_INCREMENT PRIMARY KEY,
    id_laptop           INT             NOT NULL,
    type                ENUM('ENTREE','SORTIE') NOT NULL,
    date                DATE            NOT NULL DEFAULT (CURRENT_DATE),
    quantite            INT             NOT NULL DEFAULT 1 CHECK (quantite > 0),
    description         TEXT,
    responsable         VARCHAR(100),
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mouv_laptop FOREIGN KEY (id_laptop) REFERENCES laptops(id_laptop) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Enregistrement de toutes les entrées et sorties de stock';

-- ============================================================
-- TABLE : MAINTENANCES
-- ============================================================
CREATE TABLE maintenances (
    id_maintenance      INT             AUTO_INCREMENT PRIMARY KEY,
    id_laptop           INT             NOT NULL,
    date_soumission     DATE            NOT NULL DEFAULT (CURRENT_DATE),
    date_resolution     DATE,
    description         TEXT            NOT NULL,
    priorite            ENUM('FAIBLE','MOYENNE','HAUTE','CRITIQUE')         NOT NULL DEFAULT 'MOYENNE',
    statut              ENUM('OUVERT','EN_COURS','RESOLU','FERME')          NOT NULL DEFAULT 'OUVERT',
    technicien          VARCHAR(100),
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maint_laptop FOREIGN KEY (id_laptop) REFERENCES laptops(id_laptop) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Tickets de maintenance associés aux laptops';

-- ============================================================
-- TABLE : ALERTES
-- ============================================================
CREATE TABLE alertes (
    id_alerte           INT             AUTO_INCREMENT PRIMARY KEY,
    id_laptop           INT             NOT NULL,
    type_alerte         ENUM('FIN_GARANTIE','SEUIL_STOCK','ANOMALIE','MAINTENANCE_REQUISE') NOT NULL,
    message             TEXT            NOT NULL,
    date_creation       DATE            NOT NULL DEFAULT (CURRENT_DATE),
    est_lue             BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alerte_laptop FOREIGN KEY (id_laptop) REFERENCES laptops(id_laptop) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Notifications système : fin de garantie, seuil de stock, anomalies';

-- ============================================================
-- TABLE : RAPPORTS
-- ============================================================
CREATE TABLE rapports (
    id_rapport          INT             AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur      INT,
    titre               VARCHAR(200)    NOT NULL,
    type_rapport        VARCHAR(50)     NOT NULL,
    date_generation     DATE            NOT NULL DEFAULT (CURRENT_DATE),
    format              ENUM('PDF','EXCEL','WORD') NOT NULL DEFAULT 'PDF',
    lien_fichier        TEXT,
    genere_par_ia       BOOLEAN         NOT NULL DEFAULT FALSE COMMENT 'TRUE si généré via Claude API',
    contenu_ia          TEXT            COMMENT 'Réponse JSON de Claude API',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rapport_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Rapports générés — classiques ou par IA (Claude API)';

-- ============================================================
-- INDEX POUR LES PERFORMANCES
-- ============================================================

-- Laptops
CREATE INDEX idx_laptops_statut     ON laptops(statut);
CREATE INDEX idx_laptops_marque     ON laptops(marque);

-- Attributions
CREATE INDEX idx_attributions_laptop      ON attributions(id_laptop);
CREATE INDEX idx_attributions_utilisateur ON attributions(id_utilisateur);
CREATE INDEX idx_attributions_statut      ON attributions(statut);

-- Mouvements
CREATE INDEX idx_mouvements_laptop  ON mouvements(id_laptop);
CREATE INDEX idx_mouvements_date    ON mouvements(date);

-- Maintenances
CREATE INDEX idx_maintenances_laptop ON maintenances(id_laptop);
CREATE INDEX idx_maintenances_statut ON maintenances(statut);

-- Alertes
CREATE INDEX idx_alertes_laptop     ON alertes(id_laptop);
CREATE INDEX idx_alertes_est_lue    ON alertes(est_lue);

-- ============================================================
-- DONNÉES DE TEST
-- ============================================================

-- Utilisateurs (mots de passe hashés avec bcrypt en prod)
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, departement) VALUES
('Admin',   'System',  'admin@laptopstock.com',        '$2b$10$hashadmin',  'ADMINISTRATEUR', 'IT'),
('Dupont',  'Jean',    'jean.dupont@laptopstock.com',  '$2b$10$hashgest',   'GESTIONNAIRE',   'Logistique'),
('Martin',  'Sophie',  'sophie.martin@laptopstock.com','$2b$10$hashuser',   'UTILISATEUR',    'RH'),
('Bernard', 'Pierre',  'pierre.bernard@laptopstock.com','$2b$10$hashtech',  'GESTIONNAIRE',   'Technique');

-- Laptops
INSERT INTO laptops (marque, modele, numero_serie, processeur, ram, stockage, etat, statut, date_achat) VALUES
('Dell',   'XPS 15',         'SN-DELL-001',  'i7-12700H', 16, '512GB SSD', 'NEUF',     'DISPONIBLE',    '2024-01-15'),
('Apple',  'MacBook Pro 14', 'SN-APPLE-002', 'M3 Pro',    18, '512GB SSD', 'BON_ETAT', 'ATTRIBUE',      '2023-06-20'),
('Lenovo', 'ThinkPad X1',    'SN-LEN-003',   'i7-1365U',  32, '1TB SSD',   'BON_ETAT', 'EN_REPARATION', '2023-03-10'),
('HP',     'EliteBook 840',  'SN-HP-004',    'i5-1345U',  16, '256GB SSD', 'NEUF',     'DISPONIBLE',    '2024-02-28'),
('Dell',   'Latitude 5540',  'SN-DELL-005',  'i5-1335U',   8, '256GB SSD', 'DEGRADE',  'DISPONIBLE',    '2022-09-01');

-- Mouvements
INSERT INTO mouvements (id_laptop, type, date, quantite, description, responsable) VALUES
(1, 'ENTREE', '2024-01-15', 1, 'Achat neuf fournisseur Dell',   'Admin'),
(2, 'ENTREE', '2023-06-20', 1, 'Achat neuf fournisseur Apple',  'Admin'),
(3, 'ENTREE', '2023-03-10', 1, 'Achat neuf fournisseur Lenovo', 'Admin'),
(3, 'SORTIE', '2025-01-05', 1, 'Envoi en réparation',           'Jean Dupont'),
(4, 'ENTREE', '2024-02-28', 1, 'Réception fournisseur HP',      'Jean Dupont');

-- Attribution
INSERT INTO attributions (id_laptop, id_utilisateur, date_attribution, motif, statut) VALUES
(2, 3, '2024-03-01', 'Poste de travail RH', 'ACTIVE');

-- Maintenances
INSERT INTO maintenances (id_laptop, description, priorite, statut, technicien) VALUES
(3, 'Écran cassé suite à une chute — remplacement dalle LCD', 'HAUTE',   'EN_COURS', 'Pierre Bernard'),
(5, 'Batterie défectueuse, autonomie < 30 min',               'MOYENNE', 'OUVERT',   NULL);

-- Alertes
INSERT INTO alertes (id_laptop, type_alerte, message, est_lue) VALUES
(5, 'FIN_GARANTIE', 'Le laptop Dell Latitude 5540 (SN-DELL-005) : garantie expire dans 30 jours.', FALSE),
(3, 'ANOMALIE',     'Le laptop ThinkPad X1 est en réparation depuis plus de 30 jours.',            FALSE);

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT 'utilisateurs' AS table_name, COUNT(*) AS nb_lignes FROM utilisateurs
UNION ALL SELECT 'laptops',      COUNT(*) FROM laptops
UNION ALL SELECT 'attributions', COUNT(*) FROM attributions
UNION ALL SELECT 'mouvements',   COUNT(*) FROM mouvements
UNION ALL SELECT 'maintenances', COUNT(*) FROM maintenances
UNION ALL SELECT 'alertes',      COUNT(*) FROM alertes
UNION ALL SELECT 'rapports',     COUNT(*) FROM rapports;
