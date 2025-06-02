-- Initialisation de la base de données pour le dashboard de sécurité

-- Table des scans
CREATE TABLE scans (
    id SERIAL PRIMARY KEY,
    tool_name VARCHAR(50) NOT NULL,  -- 'trivy', 'sonarqube', 'selenium', 'owasp_zap'
    scan_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    target_name VARCHAR(255) NOT NULL,  -- Nom de l'application/conteneur/projet scanné
    scan_status VARCHAR(20) NOT NULL,   -- 'success', 'failed', 'warning'
    total_issues INT NOT NULL DEFAULT 0,
    high_severity_count INT NOT NULL DEFAULT 0,
    medium_severity_count INT NOT NULL DEFAULT 0,
    low_severity_count INT NOT NULL DEFAULT 0,
    raw_report JSONB,                   -- Rapport complet au format JSON
    pipeline_run_id VARCHAR(100),       -- ID du run Azure DevOps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des vulnérabilités
CREATE TABLE vulnerabilities (
    id SERIAL PRIMARY KEY,
    scan_id INT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    tool_name VARCHAR(50) NOT NULL,
    vulnerability_id VARCHAR(100),      -- ID spécifique à l'outil (CVE, etc.)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,      -- 'critical', 'high', 'medium', 'low', 'info'
    category VARCHAR(100),              -- Type de vulnérabilité (XSS, CSRF, etc.)
    location VARCHAR(255),              -- Emplacement (fichier, URL, container, etc.)
    remediation TEXT,                   -- Suggestion de correction
    status VARCHAR(20) DEFAULT 'open',  -- 'open', 'fixed', 'false_positive', 'accepted_risk'
    first_detected TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_detected TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fixed_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des métriques
CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    scan_id INT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    tool_name VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,   -- 'code_coverage', 'test_success_rate', etc.
    metric_value DECIMAL(10, 2) NOT NULL,
    metric_unit VARCHAR(20),             -- '%', 'count', 'time', etc.
    comparison_value DECIMAL(10, 2),     -- Valeur précédente pour comparaison
    threshold_value DECIMAL(10, 2),      -- Seuil d'alerte
    status VARCHAR(20),                  -- 'good', 'warning', 'critical'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des projets
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    repository_url VARCHAR(255),
    azure_devops_project_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des configurations des outils
CREATE TABLE tool_configs (
    id SERIAL PRIMARY KEY,
    tool_name VARCHAR(50) NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    config_json JSONB,                  -- Paramètres spécifiques à l'outil
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Ajout des index pour améliorer les performances
CREATE INDEX idx_vulnerabilities_scan_id ON vulnerabilities(scan_id);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX idx_metrics_scan_id ON metrics(scan_id);
CREATE INDEX idx_scans_tool_name ON scans(tool_name);
CREATE INDEX idx_scans_scan_date ON scans(scan_date);