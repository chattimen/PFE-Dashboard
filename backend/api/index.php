<?php
header('Content-Type: application/json');

// Debugging information
// echo "Request URI: " . $_SERVER['REQUEST_URI'] . "<br>"; // Debug: Print request URI

// Get clean path
$request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request = str_replace('/api', '', $request); // Remove /api prefix

// Set the base directory for the API
$baseDir = __DIR__; // This will point to the current directory of the 'api' folder

// Extraction des parties de l'URL pour les sous-endpoints
$parts = explode('/', trim($request, '/'));
$mainEndpoint = $parts[0] ?? '';
$subEndpoint = $parts[1] ?? '';
$id = $parts[2] ?? null;

// Debugging
// echo "Main: $mainEndpoint, Sub: $subEndpoint, ID: $id <br>";

// Traitement des différents endpoints
if ($mainEndpoint === 'vulnerabilities') {
    if (empty($subEndpoint)) {
        // GET /api/vulnerabilities
        require $baseDir . '/vulnerabilities.php';
    } elseif (is_numeric($subEndpoint)) {
        // GET /api/vulnerabilities/{id}
        $vulnId = $subEndpoint;
        require $baseDir . '/vulnerability_detail.php';
    } elseif ($subEndpoint === 'stats') {
        // GET /api/vulnerabilities/stats
        require $baseDir . '/vulnerability_stats.php';
    } elseif ($subEndpoint === 'trends') {
        // GET /api/vulnerabilities/trends
        require $baseDir . '/vulnerability_trends.php';
    } else {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Vulnerability endpoint not found"]);
    }
} elseif ($mainEndpoint === 'scans') {
    if (empty($subEndpoint)) {
        // GET /api/scans
        require $baseDir . '/scans.php';
    } elseif (is_numeric($subEndpoint)) {
        // GET /api/scans/{id}
        $scanId = $subEndpoint;
        require $baseDir . '/scan_detail.php';
    } elseif ($subEndpoint === 'stats') {
        // GET /api/scans/stats
        require $baseDir . '/scan_stats.php';
    } elseif ($subEndpoint === 'trends') {
        // GET /api/scans/trends
        require $baseDir . '/scan_trends.php';
    } else {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Scan endpoint not found"]);
    }
} elseif ($mainEndpoint === 'metrics') {
    // GET /api/metrics
    require $baseDir . '/metrics.php';
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Endpoint not found: " . $request]);
}