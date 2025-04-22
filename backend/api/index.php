<?php
header('Content-Type: application/json');

$request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request = str_replace('/api', '', $request);

$baseDir = __DIR__;

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
    default:
        http_response_code(404);
        echo json_encode(["error" => "Endpoint not found"]);
        break;
}
