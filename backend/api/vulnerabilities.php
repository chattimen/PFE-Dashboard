<?php
/**
 * API pour la gestion des vulnérabilités
 */

// Headers pour l'API
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Gérer les requêtes OPTIONS (pour CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Inclusion des fichiers nécessaires
require_once __DIR__ . '/../controllers/VulnerabilityController.php';

// Instanciation du contrôleur
$controller = new VulnerabilityController();

// Récupération de l'URI
$requestUri = $_SERVER['REQUEST_URI'];
$baseUri = '/api/vulnerabilities';  // Ajustez en fonction de votre configuration

// Extraction du chemin relatif
$path = parse_url($requestUri, PHP_URL_PATH);
$path = str_replace($baseUri, '', $path);
$segments = explode('/', trim($path, '/'));

// Routage des requêtes
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (empty($segments[0])) {
            // GET /api/vulnerabilities
            $controller->getAll();
        } elseif ($segments[0] === 'stats') {
            // GET /api/vulnerabilities/stats
            $controller->getStats();
        } elseif ($segments[0] === 'trends') {
            // GET /api/vulnerabilities/trends
            $controller->getTrends();
        } elseif (is_numeric($segments[0])) {
            // GET /api/vulnerabilities/{id}
            $controller->getOne($segments[0]);
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Endpoint non trouvé']);
        }
        break;
    
    case 'POST':
        if (empty($segments[0])) {
            // POST /api/vulnerabilities
            $controller->add();
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Endpoint non trouvé']);
        }
        break;
    
    case 'PUT':
    case 'PATCH':
        if (is_numeric($segments[0])) {
            // PUT/PATCH /api/vulnerabilities/{id}
            $controller->update($segments[0]);
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Endpoint non trouvé']);
        }
        break;
    
    default:
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée']);
        break;
}