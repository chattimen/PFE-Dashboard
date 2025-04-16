<?php
/**
 * Script d'importation des résultats des tests Selenium
 * 
 * Ce script analyse le rapport XML ou JSON généré par Selenium et l'importe dans la base de données.
 * 
 * Utilisation:
 * php import_selenium.php chemin/vers/rapport.xml|json [nom_de_la_cible]
 */

// Charger les dépendances
require_once __DIR__ . '/../backend/models/Database.php';
require_once __DIR__ . '/../backend/models/ScanModel.php';
require_once __DIR__ . '/../backend/models/MetricModel.php';

// Vérifier les arguments
if ($argc < 2) {
    echo "Usage: php import_selenium.php chemin/vers/rapport.xml|json [nom_de_la_cible]\n";
    exit(1);
}

$filePath = $argv[1];
$targetName = $argc > 2 ? $argv[2] : basename($filePath, pathinfo($filePath, PATHINFO_EXTENSION));
$pipelineRunId = getenv('BUILD_BUILDID') ?: null;  // Récupère l'ID du pipeline Azure DevOps si disponible

// Vérifier l'existence du fichier
if (!file_exists($filePath)) {
    echo "Erreur: Le fichier '$filePath' n'existe pas.\n";
    exit(1);
}

// Initialiser les modèles
$scanModel = new ScanModel();
$metricModel = new MetricModel();

/**
 * Traite un rapport XML Selenium JUnit
 */
function processSeleniumXmlReport($filePath, $targetName) {
    global $scanModel, $metricModel, $pipelineRunId;
    
    try {
        // Charger le fichier XML
        $xml = simplexml_load_file($filePath);
        if (!$xml) {
            throw new Exception("Format XML invalide");
        }
        
        // Compter les tests réussis, échoués et ignorés
        $totalTests = 0;
        $passedTests = 0;
        $failedTests = 0;
        $skippedTests = 0;
        
        // Compiler les résultats des tests pour chaque suite de test
        foreach ($xml->testsuite as $testsuite) {
            $attributes = $testsuite->attributes();
            
            $totalTests += (int)$attributes->tests;
            $failedTests += (int)$attributes->failures + (int)$attributes->errors;
            $skippedTests += (int)$attributes->skipped;
        }
        
        $passedTests = $totalTests - $failedTests - $skippedTests;
        
        // Déterminer le statut du scan
        $scanStatus = 'success';
        if ($failedTests > 0) {
            $scanStatus = 'failed';
        } elseif ($skippedTests > 0) {
            $scanStatus = 'warning';
        }
        
        // Créer l'entrée de scan
        $scanData = [
            'tool_name' => 'selenium',
            'target_name' => $targetName,
            'scan_status' => $scanStatus,
            'total_issues' => $failedTests,
            'high_severity_count' => $failedTests,
            'medium_severity_count' => 0,
            'low_severity_count' => 0,
            'raw_report' => [
                'total_tests' => $totalTests,
                'passed_tests' => $passedTests,
                'failed_tests' => $failedTests,
                'skipped_tests' => $skippedTests
            ],
            'pipeline_run_id' => $pipelineRunId
        ];
        
        // Insérer le scan dans la base de données
        $scanId = $scanModel->addScan($scanData);
        echo "Scan Selenium ajouté avec succès (ID: $scanId)\n";
        
        // Ajouter les métriques
        $metrics = [
            [
                'name' => 'test_total',
                'value' => $totalTests,
                'unit' => 'count',
                'status' => 'good'
            ],
            [
                'name' => 'test_success_rate',
                'value' => ($totalTests > 0) ? round(($passedTests / $totalTests) * 100, 2) : 0,
                'unit' => '%',
                'status' => ($failedTests === 0) ? 'good' : (($failedTests < 3) ? 'warning' : 'critical')
            ],
            [
                'name' => 'test_failed',
                'value' => $failedTests,
                'unit' => 'count',
                'status' => ($failedTests === 0) ? 'good' : (($failedTests < 3) ? 'warning' : 'critical')
            ],
            [
                'name' => 'test_skipped',
                'value' => $skippedTests,
                'unit' => 'count',
                'status' => 'good'
            ]
        ];
        
        foreach ($metrics as $metric) {
            $metricData = [
                'scan_id' => $scanId,
                'tool_name' => 'selenium',
                'metric_name' => $metric['name'],
                'metric_value' => $metric['value'],
                'metric_unit' => $metric['unit'],
                'status' => $metric['status']
            ];
            
            $metricModel->addMetric($metricData);
        }
        
        echo "Import terminé: $totalTests tests au total, $passedTests réussis, $failedTests échoués, $skippedTests ignorés\n";
        return true;
    } catch (Exception $e) {
        echo "Erreur lors de l'import XML Selenium: " . $e->getMessage() . "\n";
        return false;
    }
}

/**
 * Traite un rapport JSON Selenium
 */
function processSeleniumJsonReport($filePath, $targetName) {
    global $scanModel, $metricModel, $pipelineRunId;
    
    try {
        // Lire le fichier JSON
        $jsonContent = file_get_contents($filePath);
        $seleniumReport = json_decode($jsonContent, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Format JSON invalide: " . json_last_error_msg());
        }
        
        // Compter les tests réussis, échoués et ignorés
        $totalTests = 0;
        $passedTests = 0;
        $failedTests = 0;
        $skippedTests = 0;
        
        // Format Mocha/JSON Reporter
        if (isset($seleniumReport['stats'])) {
            $totalTests = $seleniumReport['stats']['tests'];
            $passedTests = $seleniumReport['stats']['passes'];
            $failedTests = $seleniumReport['stats']['failures'];
            $skippedTests = $seleniumReport['stats']['pending'] ?? 0;
        }
        // Format TestNG JSON
        else if (isset($seleniumReport['testng-results'])) {
            $totalTests = (int)$seleniumReport['testng-results']['@attributes']['total'];
            $passedTests = (int)$seleniumReport['testng-results']['@attributes']['passed'];
            $failedTests = (int)$seleniumReport['testng-results']['@attributes']['failed'];
            $skippedTests = (int)$seleniumReport['testng-results']['@attributes']['skipped'];
        }
        // Format personnalisé (exemple)
        else if (isset($seleniumReport['summary'])) {
            $totalTests = $seleniumReport['summary']['total'] ?? 0;
            $passedTests = $seleniumReport['summary']['passed'] ?? 0;
            $failedTests = $seleniumReport['summary']['failed'] ?? 0;
            $skippedTests = $seleniumReport['summary']['skipped'] ?? 0;
        }
        else {
            throw new Exception("Format de rapport Selenium non reconnu");
        }
        
        // Déterminer le statut du scan
        $scanStatus = 'success';
        if ($failedTests > 0) {
            $scanStatus = 'failed';
        } elseif ($skippedTests > 0) {
            $scanStatus = 'warning';
        }
        
        // Créer l'entrée de scan
        $scanData = [
            'tool_name' => 'selenium',
            'target_name' => $targetName,
            'scan_status' => $scanStatus,
            'total_issues' => $failedTests,
            'high_severity_count' => $failedTests,
            'medium_severity_count' => 0,
            'low_severity_count' => 0,
            'raw_report' => [
                'total_tests' => $totalTests,
                'passed_tests' => $passedTests,
                'failed_tests' => $failedTests,
                'skipped_tests' => $skippedTests
            ],
            'pipeline_run_id' => $pipelineRunId
        ];
        
        // Insérer le scan dans la base de données
        $scanId = $scanModel->addScan($scanData);
        echo "Scan Selenium ajouté avec succès (ID: $scanId)\n";
        
        // Ajouter les métriques
        $metrics = [
            [
                'name' => 'test_total',
                'value' => $totalTests,
                'unit' => 'count',
                'status' => 'good'
            ],
            [
                'name' => 'test_success_rate',
                'value' => ($totalTests > 0) ? round(($passedTests / $totalTests) * 100, 2) : 0,
                'unit' => '%',
                'status' => ($failedTests === 0) ? 'good' : (($failedTests < 3) ? 'warning' : 'critical')
            ],
            [
                'name' => 'test_failed',
                'value' => $failedTests,
                'unit' => 'count',
                'status' => ($failedTests === 0) ? 'good' : (($failedTests < 3) ? 'warning' : 'critical')
            ],
            [
                'name' => 'test_skipped',
                'value' => $skippedTests,
                'unit' => 'count',
                'status' => 'good'
            ],
            [
                'name' => 'test_duration',
                'value' => isset($seleniumReport['stats']['duration']) ? round($seleniumReport['stats']['duration'] / 1000, 2) : 0,
                'unit' => 'seconds',
                'status' => 'good'
            ]
        ];
        
        foreach ($metrics as $metric) {
            $metricData = [
                'scan_id' => $scanId,
                'tool_name' => 'selenium',
                'metric_name' => $metric['name'],
                'metric_value' => $metric['value'],
                'metric_unit' => $metric['unit'],
                'status' => $metric['status']
            ];
            
            $metricModel->addMetric($metricData);
        }
        
        echo "Import terminé: $totalTests tests au total, $passedTests réussis, $failedTests échoués, $skippedTests ignorés\n";
        return true;
    } catch (Exception $e) {
        echo "Erreur lors de l'import JSON Selenium: " . $e->getMessage() . "\n";
        return false;
    }
}

// Déterminer le type de fichier et lancer le traitement approprié
$fileExtension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

echo "Démarrage de l'import du rapport Selenium: $filePath\n";
if ($fileExtension === 'xml') {
    if (processSeleniumXmlReport($filePath, $targetName)) {
        echo "Import XML terminé avec succès.\n";
        exit(0);
    } else {
        echo "Échec de l'import XML.\n";
        exit(1);
    }
} elseif ($fileExtension === 'json') {
    if (processSeleniumJsonReport($filePath, $targetName)) {
        echo "Import JSON terminé avec succès.\n";
        exit(0);
    } else {
        echo "Échec de l'import JSON.\n";
        exit(1);
    }
} else {
    echo "Format de fichier non pris en charge: $fileExtension. Utilisez XML ou JSON.\n";
    exit(1);
}