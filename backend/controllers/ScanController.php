<?php
/**
 * Contrôleur pour gérer les scans
 */
ini_set('memory_limit', '716M');
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
    public function getScans($filters = [], $limit = 50, $offset = 0) {
        // Si appelé via API
        if (empty($filters) && isset($_GET)) {
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
        }
        
        try {
            $scans = $this->scanModel->getAllScans($filters, $limit, $offset) ?? [];
            
            // Compter le total pour la pagination
            $totalCount = count($scans);
            
            if (isset($_SERVER['REQUEST_METHOD'])) {
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'data' => $scans,
                    'total' => $totalCount,
                    'limit' => $limit,
                    'offset' => $offset
                ]);
            } else {
                return $scans;
            }
        } catch (Exception $e) {
            if (isset($_SERVER['REQUEST_METHOD'])) {
                $this->sendErrorResponse($e->getMessage());
            } else {
                throw $e;
            }
        }
    }
    
    /**
     * Récupère un scan par son ID
     */
    public function getScanDetails($id) {
        try {
            $scan = $this->scanModel->getScanById($id);
            
            if (!$scan) {
                if (isset($_SERVER['REQUEST_METHOD'])) {
                    $this->sendErrorResponse("Scan non trouvé", 404);
                    return;
                } else {
                    return null;
                }
            }
            
            if (isset($_SERVER['REQUEST_METHOD'])) {
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'data' => $scan
                ]);
            } else {
                return $scan;
            }
        } catch (Exception $e) {
            if (isset($_SERVER['REQUEST_METHOD'])) {
                $this->sendErrorResponse($e->getMessage());
            } else {
                throw $e;
            }
        }
    }
    
    /**
     * Ajoute un nouveau scan
     */
    public function addScan($data = null) {
        // Si appelé via API
        if ($data === null) {
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
        }
        
        // Valider les données requises
        if (empty($data['tool_name']) || empty($data['target_name']) || empty($data['scan_status'])) {
            if (isset($_SERVER['REQUEST_METHOD'])) {
                $this->sendErrorResponse("Données manquantes: tool_name, target_name et scan_status sont requis");
                return;
            } else {
                throw new Exception("Données manquantes: tool_name, target_name et scan_status sont requis");
            }
        }
        
        try {
            $id = $this->scanModel->addScan($data);
            
            if (isset($_SERVER['REQUEST_METHOD'])) {
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Scan ajouté avec succès',
                    'id' => $id
                ]);
            } else {
                return $id;
            }
        } catch (Exception $e) {
            if (isset($_SERVER['REQUEST_METHOD'])) {
                $this->sendErrorResponse($e->getMessage());
            } else {
                throw $e;
            }
        }
    }
    
    /**
     * Supprime un scan
     */
    public function deleteScan($id) {
        try {
            $scan = $this->scanModel->getScanById($id);
            
            if (!$scan) {
                if (isset($_SERVER['REQUEST_METHOD'])) {
                    $this->sendErrorResponse("Scan non trouvé", 404);
                    return;
                } else {
                    return false;
                }
            }
            
            $success = $this->scanModel->deleteScan($id);
            
            if (isset($_SERVER['REQUEST_METHOD'])) {
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Scan supprimé avec succès'
                ]);
            } else {
                return $success;
            }
        } catch (Exception $e) {
            if (isset($_SERVER['REQUEST_METHOD'])) {
                $this->sendErrorResponse($e->getMessage());
            } else {
                throw $e;
            }
        }
    }
    
    /**
     * Récupère les statistiques des scans
     */
    public function getScanStats($filters = []) {
        $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
        $tool_name = isset($_GET['tool_name']) ? $_GET['tool_name'] : null;
        
        if (is_array($filters)) {
            if (isset($filters['days'])) {
                $days = intval($filters['days']);
            }
            if (isset($filters['tool_name'])) {
                $tool_name = $filters['tool_name'];
            }
        }
        
        try {
            $stats = $this->scanModel->getScanStats($days, $tool_name);
            $filtered_stats = $stats;
            if ($tool_name) {
                $filtered_stats = array_filter($stats, function($stat) use ($tool_name) {
                    return isset($stat['tool_name']) && strtolower($stat['tool_name']) === strtolower($tool_name);
                });
                $filtered_stats = array_values($filtered_stats); // Réindexer le tableau
            }
            
            if (isset($_SERVER['REQUEST_METHOD'])) {
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'data' => $filtered_stats
                ]);
                exit; // Ensure clean exit
            } else {
                return $filtered_stats;
            }
        } catch (Exception $e) {
            if (isset($_SERVER['REQUEST_METHOD'])) {
                $this->sendErrorResponse($e->getMessage());
            } else {
                throw $e;
            }
        }
    }
    
    /**
     * Récupère les tendances des scans
     */
    public function getScanTrends($days = 30) {
        // Si appelé via API
        if (isset($_GET['days'])) {
            $days = intval($_GET['days']);
        }
        
        // Validation du paramètre days
        if ($days < 1) {
            $days = 1;
        } else if ($days > 365) {
            $days = 365;
        }
        
        try {
            $trends = $this->scanModel->getScanTrends($days);
            
            if (isset($_SERVER['REQUEST_METHOD'])) {
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'data' => $trends
                ]);
            } else {
                return $trends;
            }
        } catch (Exception $e) {
            if (isset($_SERVER['REQUEST_METHOD'])) {
                $this->sendErrorResponse($e->getMessage());
            } else {
                throw $e;
            }
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
    
    /**
     * Alias pour getScans (compatibilité)
     */
    public function getAll() {
        return $this->getScans();
    }
    
    /**
     * Alias pour getScanDetails (compatibilité)
     */
    public function getOne($id) {
        return $this->getScanDetails($id);
    }
    
    /**
     * Alias pour getScanStats (compatibilité)
     */
    public function getStats() {
        return $this->getScanStats();
    }
    
    /**
     * Alias pour getScanTrends (compatibilité)
     */
    public function getTrends() {
        return $this->getScanTrends();
    }
    
    /**
     * Alias pour addScan (compatibilité)
     */
    public function add() {
        return $this->addScan();
    }
    
    /**
     * Alias pour deleteScan (compatibilité)
     */
    public function delete($id) {
        return $this->deleteScan($id);
    }
}