<?php
header('Content-Type: application/json');

// Debugging information
echo "Request URI: " . $_SERVER['REQUEST_URI'] . "<br>"; // Debug: Print request URI

// Get clean path
$request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request = str_replace('/api', '', $request); // Remove /api prefix

// Set the base directory for the API
$baseDir = __DIR__; // This will point to the current directory of the 'api' folder

switch ($request) {
    case '/vulnerabilities':
        echo "Vulnerabilities endpoint reached.<br>"; // Debug: Check if we hit this endpoint
        require $baseDir . '/vulnerabilities.php'; // Absolute path
        break;
    case '/metrics':
        echo "Metrics endpoint reached.<br>"; // Debug: Check if we hit this endpoint
        require $baseDir . '/metrics.php'; // Absolute path
        break;
    case '/scans':
        echo "Scans endpoint reached.<br>"; // Debug: Check if we hit this endpoint
        require $baseDir . '/scans.php'; // Absolute path
        break;
    default:
        http_response_code(404);
        echo json_encode(["error" => "Endpoint not found"]);
        break;
}
