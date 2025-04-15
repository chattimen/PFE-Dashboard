<?php
/**
 * Contrôleur pour gérer les métriques
 */
class MetricController {
    private $metricModel;
    
    /**
     * Constructeur
     */
    public function __construct() {
        require_once __DIR__ . '/../models/Database.php';
        require_once __DIR__ . '/../models/MetricModel.php';
        $this->metricModel = new MetricModel();
    }
    
    /**
     * Récupère toutes les métriques avec filtrage et pagination
     */
    public function getAll() {
        // Récupérer les paramètres de la requête
        $filters = [];
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        
        // Filtres
        if (isset($_GET['tool_name'])) {
            $filters['tool_name'] = $_GET['tool_name'];
        }
        
        if (isset($_GET['metric_name'])) {
            $filters['metric_name'] = $_GET['metric_name'];
        }
        
        if (isset($_GET['scan_id'])) {
            $filters['scan_id'] = intval($_GET['scan_id']);
        }
        
        try {
            $metrics = $this->metricModel->getAllMetrics($filters, $limit, $offset);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $metrics,
                'total' => count($metrics),
                'limit' => $limit,
                'offset' => $offset
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Récupère une métrique par son ID
     */
    public function getOne($id) {
        try {
            $metric = $this->metricModel->getMetricById($id);
            
            if (!$metric) {
                $this->sendErrorResponse("Métrique non trouvée", 404);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $metric
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Ajoute une nouvelle métrique
     */
    public function add() {
        // Vérifier que la requête est en POST
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->sendErrorResponse("Méthode non autorisée", 405);
            return;
        }
        
        // Récupérer les données du corps de la requête
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            $this->sendErrorResponse("Données invalides");
            return;
        }
        
        // Valider les données requises
        if (empty($data['scan_id']) || empty($data['tool_name']) || 
            empty($data['metric_name']) || !isset($data['metric_value'])) {
            $this->sendErrorResponse("Données manquantes: scan_id, tool_name, metric_name et metric_value sont requis");
            return;
        }
        
        try {
            $id = $this->metricModel->addMetric($data);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'message' => 'Métrique ajoutée avec succès',
                'id' => $id
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Met à jour une métrique existante
     */
    public function update($id) {
        // Vérifier que la requête est en PUT ou PATCH
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
            $this->sendErrorResponse("Méthode non autorisée", 405);
            return;
        }
        
        // Récupérer les données du corps de la requête
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            $this->sendErrorResponse("Données invalides");
            return;
        }
        
        try {
            $metric = $this->metricModel->getMetricById($id);
            
            if (!$metric) {
                $this->sendErrorResponse("Métrique non trouvée", 404);
                return;
            }
            
            $success = $this->metricModel->updateMetric($id, $data);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'message' => 'Métrique mise à jour avec succès'
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Récupère les tendances des métriques
     */
    public function getTrends() {
        $metricName = isset($_GET['metric_name']) ? $_GET['metric_name'] : null;
        $toolName = isset($_GET['tool_name']) ? $_GET['tool_name'] : null;
        $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
        
        if (!$metricName) {
            $this->sendErrorResponse("Paramètre metric_name requis");
            return;
        }
        
        try {
            $trends = $this->metricModel->getMetricTrends($metricName, $toolName, $days);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $trends
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Récupère les dernières métriques par outil
     */
    public function getLatest() {
        $toolName = isset($_GET['tool_name']) ? $_GET['tool_name'] : null;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
        
        try {
            $metrics = $this->metricModel->getLatestMetrics($toolName, $limit);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $metrics
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Récupère les métriques agrégées par période
     */
    public function getAggregated() {
        $metricName = isset($_GET['metric_name']) ? $_GET['metric_name'] : null;
        $toolName = isset($_GET['tool_name']) ? $_GET['tool_name'] : null;
        $period = isset($_GET['period']) ? $_GET['period'] : 'day';
        $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
        
        if (!$metricName) {
            $this->sendErrorResponse("Paramètre metric_name requis");
            return;
        }
        
        try {
            $data = $this->metricModel->aggregateMetricsByPeriod($metricName, $period, $days, $toolName);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Envoie une réponse d'erreur au format JSON
     */
    private function sendErrorResponse($message, $statusCode = 400) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => $message
        ]);
    }
}