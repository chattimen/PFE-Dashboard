<?php
// backend/api/scan_trends.php
require_once __DIR__ . '/../controllers/ScanController.php';

$controller = new ScanController();
$days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
$trends = $controller->getScanTrends($days);

echo json_encode($trends);