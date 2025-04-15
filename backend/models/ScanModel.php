<?php
/**
 * Modèle pour gérer les scans dans la base de données
 */
class ScanModel {
    private $db;
    
    /**
     * Constructeur
     */
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Récupère tous les scans avec filtres optionnels
     */
    public function getAllScans($filters = [], $limit = 50, $offset = 0) {
        $sql = "SELECT * FROM scans WHERE 1=1";
        $params = [];
        
        // Appliquer les filtres
        if (!empty($filters['tool_name'])) {
            $sql .= " AND tool_name = ?";
            $params[] = $filters['tool_name'];
        }
        
        if (!empty($filters['scan_status'])) {
            $sql .= " AND scan_status = ?";
            $params[] = $filters['scan_status'];
        }
        
        if (!empty($filters['target_name'])) {
            $sql .= " AND target_name LIKE ?";
            $params[] = '%' . $filters['target_name'] . '%';
        }
        
        if (!empty($filters['date_from'])) {
            $sql .= " AND scan_date >= ?";
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $sql .= " AND scan_date <= ?";
            $params[] = $filters['date_to'];
        }
        
        // Ajouter tri et pagination
        $sql .= " ORDER BY scan_date DESC";
        $sql .= " LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Récupère un scan par son ID
     */
    public function getScanById($id) {
        $sql = "SELECT * FROM scans WHERE id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }
    
    /**
     * Ajoute un nouveau scan
     */
    public function addScan($data) {
        $sql = "INSERT INTO scans (
                    tool_name, target_name, scan_status, total_issues,
                    high_severity_count, medium_severity_count, low_severity_count,
                    raw_report, pipeline_run_id
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?
                ) RETURNING id";
        
        $params = [
            $data['tool_name'],
            $data['target_name'],
            $data['scan_status'],
            $data['total_issues'] ?? 0,
            $data['high_severity_count'] ?? 0,
            $data['medium_severity_count'] ?? 0,
            $data['low_severity_count'] ?? 0,
            isset($data['raw_report']) ? json_encode($data['raw_report']) : null,
            $data['pipeline_run_id'] ?? null
        ];
        
        $result = $this->db->query($sql, $params);
        return $result->fetch(PDO::FETCH_ASSOC)['id'];
    }
    
    /**
     * Met à jour un scan existant
     */
    public function updateScan($id, $data) {
        $fields = [];
        $params = [];
        
        // Construire dynamiquement les champs à mettre à jour
        foreach ($data as $key => $value) {
            if (in_array($key, ['scan_status', 'total_issues', 'high_severity_count', 'medium_severity_count', 'low_severity_count'])) {
                $fields[] = "$key = ?";
                $params[] = $value;
            } elseif ($key === 'raw_report') {
                $fields[] = "raw_report = ?";
                $params[] = json_encode($value);
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        // Ajouter l'ID à la fin des paramètres
        $params[] = $id;
        
        $sql = "UPDATE scans SET " . implode(", ", $fields) . " WHERE id = ?";
        $this->db->query($sql, $params);
        
        return true;
    }
    
    /**
     * Supprime un scan et ses données associées
     */
    public function deleteScan($id) {
        // Grâce à la contrainte ON DELETE CASCADE, les vulnérabilités et métriques seront supprimées automatiquement
        $sql = "DELETE FROM scans WHERE id = ?";
        $this->db->query($sql, [$id]);
        return true;
    }
    
    /**
     * Récupère les statistiques des scans
     */
    public function getScanStats($days = 30) {
        $sql = "SELECT 
                    tool_name,
                    COUNT(*) as total_scans,
                    AVG(total_issues) as avg_issues,
                    SUM(high_severity_count) as total_high,
                    SUM(medium_severity_count) as total_medium,
                    SUM(low_severity_count) as total_low,
                    COUNT(*) FILTER (WHERE scan_status = 'success') as success_count,
                    COUNT(*) FILTER (WHERE scan_status = 'warning') as warning_count,
                    COUNT(*) FILTER (WHERE scan_status = 'failed') as failed_count
                FROM 
                    scans
                WHERE 
                    scan_date >= (CURRENT_DATE - INTERVAL '? days')
                GROUP BY 
                    tool_name";
        
        return $this->db->fetchAll($sql, [$days]);
    }
    
    /**
     * Récupère les tendances des scans par outil
     */
    public function getScanTrends($days = 30) {
        $sql = "WITH dates AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '? days',
                        CURRENT_DATE,
                        '1 day'::interval
                    ) AS date
                )
                SELECT 
                    dates.date,
                    COALESCE(COUNT(s.id) FILTER (WHERE s.tool_name = 'trivy'), 0) as trivy_scans,
                    COALESCE(COUNT(s.id) FILTER (WHERE s.tool_name = 'sonarqube'), 0) as sonarqube_scans,
                    COALESCE(COUNT(s.id) FILTER (WHERE s.tool_name = 'selenium'), 0) as selenium_scans,
                    COALESCE(COUNT(s.id) FILTER (WHERE s.tool_name = 'owasp_zap'), 0) as zap_scans
                FROM 
                    dates
                LEFT JOIN scans s ON 
                    dates.date = date_trunc('day', s.scan_date)
                GROUP BY 
                    dates.date
                ORDER BY 
                    dates.date ASC";
        
        return $this->db->fetchAll($sql, [$days]);
    }
}