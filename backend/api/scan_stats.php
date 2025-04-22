<?php
// backend/api/scan_stats.php
require_once __DIR__ . '/../controllers/ScanController.php';

$controller = new ScanController();
$days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
$stats = $controller->getScanStats(['days' => $days]);

echo json_encode($stats);