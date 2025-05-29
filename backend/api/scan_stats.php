<?php
// backend/api/scan_stats.php
require_once __DIR__ . '/../controllers/ScanController.php';

$controller = new ScanController();
$days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
$filters = ['days' => $days];
if (isset($_GET['tool_name'])) {
    $filters['tool_name'] = $_GET['tool_name'];
}
$stats = $controller->getScanStats($filters);

header('Content-Type: application/json');
echo json_encode($stats);
exit; 