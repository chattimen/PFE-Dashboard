<?php
/**
 * Contrôleur pour gérer les scans
 */
class ScanController {
    private $scanModel;
    
    /**
     * Constructeur
     */
    public function __construct() {
        require_once __DIR__ . '/../models/Database.php';
        require_once __DIR__ . '/../models/ScanModel.php';
        $this->scanModel = new ScanModel();
    }
    
    /**
     * Récupère tous les scans avec filtrage et pagination
     */
    public function getAll() {
        // Récupérer les paramètres de la requête
        $filters = [];
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        
        // Filtres
        if (isset($_GET['tool_name'])) {
            $filters['tool_name'] = $_GET['tool_name'];
        }
        
        if (isset($_GET['scan_status'])) {
            $filters['scan_status'] = $_GET['scan_status'];
        }
        
        if (isset($_GET['target_name'])) {
            $filters['target_name'] = $_GET['target_name'];
        }
        
        if (isset($_GET['date_from'])) {
            $filters['date_from'] = $_GET['date_from'];
        }
        
        if (isset($_GET['date_to'])) {
            $filters['date_to'] = $_GET['date_to'];
        }
        
        try {
            $scans = $this->scanModel->getAllScans($filters, $limit, $offset);
            
            // Compter le total pour la pagination
            $totalCount = count($scans);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $scans,
                'total' => $totalCount,
                'limit' => $limit,
                'offset' => $offset
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Récupère un scan par son ID
     */
    public function getOne($id) {
        try {
            $scan = $this->scanModel->getScanById($id);
            
            if (!$scan) {
                $this->sendErrorResponse("Scan non trouvé", 404);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $scan
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Ajoute un nouveau scan
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
        if (empty($data['tool_name']) || empty($data['target_name']) || empty($data['scan_status'])) {
            $this->sendErrorResponse("Données manquantes: tool_name, target_name et scan_status sont requis");
            return;
        }
        
        try {
            $id = $this->scanModel->addScan($data);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'message' => 'Scan ajouté avec succès',
                'id' => $id
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Supprime un scan
     */
    public function delete($id) {
        try {
            $scan = $this->scanModel->getScanById($id);
            
            if (!$scan) {
                $this->sendErrorResponse("Scan non trouvé", 404);
                return;
            }
            
            $this->scanModel->deleteScan($id);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'message' => 'Scan supprimé avec succès'
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Récupère les statistiques des scans
     */
    public function getStats() {
        $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
        
        try {
            $stats = $this->scanModel->getScanStats($days);
            
            header('Content-Type: application/json');
            echo json_encode([
                'status' => 'success',
                'data' => $stats
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    
    /**
     * Récupère les tendances des scans
     */
    public function getTrends() {
        $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
        
        // Validation du paramètre days
        if ($days < 1) {
            $days = 1;
        } else if ($days > 365) {
            $days = 365;
        }
        
        try {
            $trends = $this->scanModel->getScanTrends($days);
            
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