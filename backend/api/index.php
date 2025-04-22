<?php
header('Content-Type: application/json');

// Get clean path
$request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request = str_replace('/api', '', $request); // Remove /api prefix

$baseDir = __DIR__;

// Routing
switch ($request) {
    case '/vulnerabilities':
        require $baseDir . '/vulnerabilities.php';
        break;
    case '/metrics':
        require $baseDir . '/metrics.php';
        break;
    case '/scans':
        require $baseDir . '/scans.php';
        break;

    case (preg_match('#^/vulnerabilities/stats$#', $request) ? true : false):
        require $baseDir . '/vulnerabilities_stats.php';
        break;
    case (preg_match('#^/scans/stats$#', $request) ? true : false):
        require $baseDir . '/scans_stats.php';
        break;
    case (preg_match('#^/vulnerabilities/trends$#', $request) ? true : false):
        require $baseDir . '/vulnerabilities_trends.php';
        break;
    case (preg_match('#^/scans/trends$#', $request) ? true : false):
        require $baseDir . '/scans_trends.php';
        break;
    case (preg_match('#^/vulnerabilities/\d+$#', $request) ? true : false):
        require $baseDir . '/vulnerabilities_view.php';
        break;
    default:
        http_response_code(404);
        echo json_encode(["error" => "Endpoint not found"]);
        break;
}
