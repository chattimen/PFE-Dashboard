<?php
header("Content-Type: application/json");

// Clean path
$request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request = str_replace('/api', '', $request); // remove prefix

$baseDir = __DIR__; // backend/api

switch (true) {
    case preg_match('#^/vulnerabilities#', $request):
        require_once $baseDir . '/vulnerabilities.php';
        break;
    case preg_match('#^/scans#', $request):
        require_once $baseDir . '/scans.php';
        break;
    case preg_match('#^/metrics#', $request):
        require_once $baseDir . '/metrics.php';
        break;
    case '/scans/stats':
        require_once __DIR__ . '/scan_stats.php';
        break;
    case '/scans/trends':
        require_once __DIR__ . '/scan_trends.php';
        break;
    default:
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Endpoint not found"]);
        break;
}
