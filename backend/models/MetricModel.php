<?php
/**
 * Modèle pour gérer les métriques dans la base de données
 */
class MetricModel {
    private $db;
    
    /**
     * Constructeur
     */
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Récupère toutes les métriques avec filtres optionnels
     */
    public function getAllMetrics($filters = [], $limit = 100, $offset = 0) {
        $sql = "SELECT * FROM metrics WHERE 1=1";
        $params = [];
        
        // Appliquer les filtres
        if (!empty($filters['tool_name'])) {
            $sql .= " AND tool_name = ?";
            $params[] = $filters['tool_name'];
        }
        
        if (!empty($filters['metric_name'])) {
            $sql .= " AND metric_name = ?";
            $params[] = $filters['metric_name'];
        }
        
        if (!empty($filters['scan_id'])) {
            $sql .= " AND scan_id = ?";
            $params[] = $filters['scan_id'];
        }
        
        // Ajouter tri et pagination
        $sql .= " ORDER BY created_at DESC";
        $sql .= " LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Récupère une métrique par son ID
     */
    public function getMetricById($id) {
        $sql = "SELECT * FROM metrics WHERE id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }
    
    /**
     * Ajoute une nouvelle métrique
     */
    public function addMetric($data) {
        $sql = "INSERT INTO metrics (
                    scan_id, tool_name, metric_name, metric_value, 
                    metric_unit, comparison_value, threshold_value, status
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?
                ) RETURNING id";
        
        $params = [
            $data['scan_id'],
            $data['tool_name'],
            $data['metric_name'],
            $data['metric_value'],
            $data['metric_unit'] ?? null,
            $data['comparison_value'] ?? null,
            $data['threshold_value'] ?? null,
            $data['status'] ?? null
        ];
        
        $result = $this->db->query($sql, $params);
        return $result->fetch(PDO::FETCH_ASSOC)['id'];
    }
    
    /**
     * Met à jour une métrique existante
     */
    public function updateMetric($id, $data) {
        $fields = [];
        $params = [];
        
        // Construire dynamiquement les champs à mettre à jour
        foreach ($data as $key => $value) {
            if (in_array($key, ['metric_value', 'comparison_value', 'threshold_value', 'status'])) {
                $fields[] = "$key = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        // Ajouter l'ID à la fin des paramètres
        $params[] = $id;
        
        $sql = "UPDATE metrics SET " . implode(", ", $fields) . " WHERE id = ?";
        $this->db->query($sql, $params);
        
        return true;
    }
    
    /**
     * Récupère les tendances des métriques au cours du temps
     */
    public function getMetricTrends($metricName, $toolName = null, $days = 30) {
        $sql = "WITH dates AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '? days',
                        CURRENT_DATE,
                        '1 day'::interval
                    ) AS date
                )
                SELECT 
                    dates.date,
                    AVG(m.metric_value) as avg_value
                FROM 
                    dates
                LEFT JOIN scans s ON 
                    dates.date = date_trunc('day', s.scan_date)
                LEFT JOIN metrics m ON 
                    s.id = m.scan_id AND m.metric_name = ?";
        
        $params = [$days, $metricName];
        
        if ($toolName) {
            $sql .= " AND m.tool_name = ?";
            $params[] = $toolName;
        }
        
        $sql .= " GROUP BY dates.date ORDER BY dates.date ASC";
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Récupère les dernières valeurs de métriques par outil
     */
    public function getLatestMetrics($toolName = null, $limit = 10) {
        $sql = "SELECT DISTINCT ON (metric_name) 
                    m.*
                FROM 
                    metrics m
                JOIN 
                    scans s ON m.scan_id = s.id";
        
        $params = [];
        
        if ($toolName) {
            $sql .= " WHERE m.tool_name = ?";
            $params[] = $toolName;
        }
        
        $sql .= " ORDER BY metric_name, s.scan_date DESC LIMIT ?";
        $params[] = $limit;
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Agrège les métriques par période (jour, semaine, mois)
     */
    public function aggregateMetricsByPeriod($metricName, $period = 'day', $days = 30, $toolName = null) {
        $periodFormat = "day";
        
        if ($period === 'week') {
            $periodFormat = "week";
        } elseif ($period === 'month') {
            $periodFormat = "month";
        }
        
        $sql = "SELECT 
                    date_trunc('$periodFormat', s.scan_date) as period,
                    AVG(m.metric_value) as avg_value,
                    MIN(m.metric_value) as min_value,
                    MAX(m.metric_value) as max_value,
                    COUNT(*) as count
                FROM 
                    metrics m
                JOIN 
                    scans s ON m.scan_id = s.id
                WHERE 
                    m.metric_name = ?
                    AND s.scan_date >= (CURRENT_DATE - INTERVAL '? days')";
        
        $params = [$metricName, $days];
        
        if ($toolName) {
            $sql .= " AND m.tool_name = ?";
            $params[] = $toolName;
        }
        
        $sql .= " GROUP BY period ORDER BY period ASC";
        
        return $this->db->fetchAll($sql, $params);
    }
}