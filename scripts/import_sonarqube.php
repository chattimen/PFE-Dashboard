<?php
/**
 * Script d'importation des résultats de SonarQube
 * 
 * Ce script récupère les résultats depuis l'API SonarQube et les importe dans la base de données.
 * 
 * Utilisation:
 * php import_sonarqube.php <project_key> [sonar_url] [token] [rapport_file]
 */

// Charger les dépendances
require_once __DIR__ . '/../backend/models/Database.php';
require_once __DIR__ . '/../backend/models/ScanModel.php';
require_once __DIR__ . '/../backend/models/VulnerabilityModel.php';
require_once __DIR__ . '/../backend/models/MetricModel.php';

// Vérifier les arguments
if ($argc < 2) {
    echo "Usage: php import_sonarqube.php <project_key> [sonar_url] [token] [rapport_file]\n";
    exit(1);
}

$projectKey = $argv[1];
$sonarUrl = $argc > 2 ? $argv[2] : 'http://localhost:9000';
$token = $argc > 3 ? $argv[3] : null;
$reportFile = $argc > 4 ? $argv[4] : null;
$pipelineRunId = getenv('BUILD_BUILDID') ?: null;  // Récupère l'ID du pipeline Azure DevOps si disponible

// Initialiser les modèles
$scanModel = new ScanModel();
$vulnerabilityModel = new VulnerabilityModel();
$metricModel = new MetricModel();

/**
 * Effectue une requête à l'API SonarQube
 */
function callSonarQubeApi($endpoint, $params = [], $token = null) {
    global $sonarUrl;
    
    $url = $sonarUrl . '/api/' . $endpoint;
    
    if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    
    if ($token) {
        $auth = base64_encode($token . ':');
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Basic ' . $auth]);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception("Erreur API SonarQube ($httpCode): " . $response);
    }
    
    return json_decode($response, true);
}

/**
 * Mappe la sévérité SonarQube vers notre système
 */
function mapSonarQubeSeverity($severity) {
    switch ($severity) {
        case 'BLOCKER':
            return 'critical';
        case 'CRITICAL':
            return 'high';
        case 'MAJOR':
            return 'medium';
        case 'MINOR':
            return 'low';
        case 'INFO':
            return 'info';
        default:
            return 'low';
    }
}

/**
 * Récupère et importe les données SonarQube
 */
function importSonarQubeData($projectKey, $token = null, $reportFile = null) {
    global $scanModel, $vulnerabilityModel, $metricModel, $pipelineRunId, $sonarUrl;
    
    try {
        $report = null;
        
        // Si un fichier de rapport est fourni, l'utiliser
        if ($reportFile && file_exists($reportFile)) {
            $jsonContent = file_get_contents($reportFile);
            $report = json_decode($jsonContent, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Format JSON invalide: " . json_last_error_msg());
            }
            
            echo "Utilisation du rapport fourni: $reportFile\n";
        } 
        // Sinon, interroger l'API SonarQube
        else {
            // Récupérer les informations du projet
            $projectInfo = callSonarQubeApi('projects/search', ['projects' => $projectKey], $token);
            if (empty($projectInfo['components'])) {
                throw new Exception("Projet non trouvé: $projectKey");
            }
            
            $project = $projectInfo['components'][0];
            $projectName = $project['name'];
            
            echo "Importation des données pour le projet: $projectName ($projectKey)\n";
            
            // Récupérer les métriques du projet
            $metrics = callSonarQubeApi('measures/component', [
                'component' => $projectKey,
                'metricKeys' => 'bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,security_rating,reliability_rating,security_hotspots'
            ], $token);
            
            // Récupérer les problèmes (issues)
            $issues = callSonarQubeApi('issues/search', [
                'componentKeys' => $projectKey,
                'resolved' => 'false',
                'ps' => 500  // Pagination: 500 issues par page
            ], $token);
            
            // Construire le rapport
            $report = [
                'project' => $project,
                'metrics' => $metrics,
                'issues' => $issues
            ];
        }
        
        // Extraire le nom du projet
        $projectName = isset($report['project']['name']) 
            ? $report['project']['name'] 
            : (isset($report['projectName']) ? $report['projectName'] : $projectKey);
        
        // Extraire les mesures
        $measuresData = [];
        if (isset($report['metrics']['component']['measures'])) {
            foreach ($report['metrics']['component']['measures'] as $measure) {
                $measuresData[$measure['metric']] = $measure['value'];
            }
        }
        
        // Compter les issues par sévérité
        $highCount = 0;
        $mediumCount = 0;
        $lowCount = 0;
        $issues = isset($report['issues']['issues']) ? $report['issues']['issues'] : [];
        
        foreach ($issues as $issue) {
            $severity = mapSonarQubeSeverity($issue['severity']);
            
            if ($severity === 'critical' || $severity === 'high') {
                $highCount++;
            } elseif ($severity === 'medium') {
                $mediumCount++;
            } elseif ($severity === 'low' || $severity === 'info') {
                $lowCount++;
            }
        }
        
        // Déterminer le statut du scan
        $scanStatus = 'success';
        if ($highCount > 0) {
            $scanStatus = 'failed';
        } elseif ($mediumCount > 0) {
            $scanStatus = 'warning';
        }
        
        // Créer l'entrée de scan
        $scanData = [
            'tool_name' => 'sonarqube',
            'target_name' => $projectName,
            'scan_status' => $scanStatus,
            'total_issues' => count($issues),
            'high_severity_count' => $highCount,
            'medium_severity_count' => $mediumCount,
            'low_severity_count' => $lowCount,
            'raw_report' => [
                'measures' => $measuresData,
                'issues_count' => count($issues)
            ],
            'pipeline_run_id' => $pipelineRunId
        ];
        
        // Insérer le scan dans la base de données
        $scanId = $scanModel->addScan($scanData);
        echo "Scan SonarQube ajouté avec succès (ID: $scanId)\n";
        
        // Ajouter les métriques
        if (!empty($measuresData)) {
            foreach ($measuresData as $metricName => $metricValue) {
                $metricData = [
                    'scan_id' => $scanId,
                    'tool_name' => 'sonarqube',
                    'metric_name' => $metricName,
                    'metric_value' => $metricValue,
                    'metric_unit' => getMetricUnit($metricName),
                    'status' => getMetricStatus($metricName, $metricValue)
                ];
                
                $metricModel->addMetric($metricData);
            }
            echo "Métriques SonarQube ajoutées avec succès\n";
        }
        
        // Ajouter les vulnérabilités
        $addedIssues = 0;
        foreach ($issues as $issue) {
            $severity = mapSonarQubeSeverity($issue['severity']);
            
            $vulnData = [
                'scan_id' => $scanId,
                'tool_name' => 'sonarqube',
                'vulnerability_id' => $issue['key'],
                'title' => $issue['message'],
                'description' => isset($issue['message']) ? $issue['message'] : null,
                'severity' => $severity,
                'category' => $issue['type'],
                'location' => isset($issue['component']) ? $issue['component'] . ':' . ($issue['line'] ?? '0') : null,
                'remediation' => null,
                'status' => 'open'
            ];
            
            $vulnerabilityModel->addVulnerability($vulnData);
            $addedIssues++;
        }
        
        echo "Import terminé: $addedIssues problèmes importés ($highCount critiques/élevés, $mediumCount moyens, $lowCount faibles)\n";
        return true;
    } catch (Exception $e) {
        echo "Erreur lors de l'import SonarQube: " . $e->getMessage() . "\n";
        return false;
    }
}

/**
 * Obtient l'unité d'une métrique SonarQube
 */
function getMetricUnit($metricName) {
    switch ($metricName) {
        case 'coverage':
        case 'duplicated_lines_density':
            return '%';
        case 'ncloc':
            return 'lines';
        case 'security_rating':
        case 'reliability_rating':
            return 'rating';
        default:
            return 'count';
    }
}

/**
 * Détermine le statut d'une métrique SonarQube
 */
function getMetricStatus($metricName, $value) {
    switch ($metricName) {
        case 'bugs':
        case 'vulnerabilities':
        case 'code_smells':
            return $value == 0 ? 'good' : ($value < 10 ? 'warning' : 'critical');
        
        case 'coverage':
            return $value >= 80 ? 'good' : ($value >= 50 ? 'warning' : 'critical');
        
        case 'duplicated_lines_density':
            return $value <= 3 ? 'good' : ($value <= 10 ? 'warning' : 'critical');
        
        case 'security_rating':
        case 'reliability_rating':
            return $value <= 2 ? 'good' : ($value <= 3 ? 'warning' : 'critical');
        
        default:
            return 'good';
    }
}

// Lancer l'importation
echo "Démarrage de l'import des données SonarQube pour le projet: $projectKey\n";
if (importSonarQubeData($projectKey, $token, $reportFile)) {
    echo "Import terminé avec succès.\n";
    exit(0);
} else {
    echo "Échec de l'import.\n";
    exit(1);
}