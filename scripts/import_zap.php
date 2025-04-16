<?php
/**
 * Script d'importation des résultats d'OWASP ZAP
 * 
 * Ce script analyse le rapport XML ou JSON généré par OWASP ZAP et l'importe dans la base de données.
 * 
 * Utilisation:
 * php import_zap.php chemin/vers/rapport.xml|json [nom_de_la_cible]
 */

// Charger les dépendances
require_once __DIR__ . '/../backend/models/Database.php';
require_once __DIR__ . '/../backend/models/ScanModel.php';
require_once __DIR__ . '/../backend/models/VulnerabilityModel.php';

// Vérifier les arguments
if ($argc < 2) {
    echo "Usage: php import_zap.php chemin/vers/rapport.xml|json [nom_de_la_cible]\n";
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
$vulnerabilityModel = new VulnerabilityModel();

/**
 * Mappe la sévérité ZAP vers notre système
 */
function mapZapSeverity($severity) {
    $severity = strtolower($severity);
    
    if ($severity === 'high' || $severity === '3') {
        return 'high';
    } elseif ($severity === 'medium' || $severity === '2') {
        return 'medium';
    } elseif ($severity === 'low' || $severity === '1') {
        return 'low';
    } elseif ($severity === 'informational' || $severity === 'info' || $severity === '0') {
        return 'info';
    } else {
        return 'low';  // Par défaut
    }
}

/**
 * Traite un rapport XML ZAP
 */
function processZapXmlReport($filePath, $targetName) {
    global $scanModel, $vulnerabilityModel, $pipelineRunId;
    
    try {
        // Charger le fichier XML
        $xml = simplexml_load_file($filePath);
        if (!$xml) {
            throw new Exception("Format XML invalide");
        }
        
        // Compter les vulnérabilités par sévérité
        $highCount = 0;
        $mediumCount = 0;
        $lowCount = 0;
        $totalCount = 0;
        
        // Analyser les alertes ZAP
        $alerts = [];
        if (isset($xml->site->alerts)) {
            foreach ($xml->site->alerts as $alertGroup) {
                foreach ($alertGroup->alertitem as $alert) {
                    $totalCount++;
                    
                    $severity = mapZapSeverity((string)$alert->riskcode);
                    if ($severity === 'high') {
                        $highCount++;
                    } elseif ($severity === 'medium') {
                        $mediumCount++;
                    } elseif ($severity === 'low' || $severity === 'info') {
                        $lowCount++;
                    }
                    
                    $alerts[] = [
                        'name' => (string)$alert->name,
                        'severity' => $severity,
                        'description' => (string)$alert->desc,
                        'solution' => (string)$alert->solution,
                        'instances' => []
                    ];
                    
                    // Récupérer les instances
                    foreach ($alert->instances->instance as $instance) {
                        $alerts[count($alerts) - 1]['instances'][] = [
                            'uri' => (string)$instance->uri,
                            'method' => (string)$instance->method,
                            'param' => (string)$instance->param,
                            'attack' => (string)$instance->attack,
                            'evidence' => (string)$instance->evidence
                        ];
                    }
                }
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
            'tool_name' => 'owasp_zap',
            'target_name' => $targetName,
            'scan_status' => $scanStatus,
            'total_issues' => $totalCount,
            'high_severity_count' => $highCount,
            'medium_severity_count' => $mediumCount,
            'low_severity_count' => $lowCount,
            'raw_report' => [
                'alerts_count' => $totalCount,
                'scan_date' => (string)$xml->site->attributes()->generated
            ],
            'pipeline_run_id' => $pipelineRunId
        ];
        
        // Insérer le scan dans la base de données
        $scanId = $scanModel->addScan($scanData);
        echo "Scan ZAP ajouté avec succès (ID: $scanId)\n";
        
        // Traiter les vulnérabilités
        $addedVulns = 0;
        foreach ($alerts as $alert) {
            foreach ($alert['instances'] as $instance) {
                $vulnData = [
                    'scan_id' => $scanId,
                    'tool_name' => 'owasp_zap',
                    'vulnerability_id' => null,
                    'title' => $alert['name'],
                    'description' => $alert['description'],
                    'severity' => $alert['severity'],
                    'category' => 'web',
                    'location' => $instance['uri'] . ' (' . $instance['method'] . ')',
                    'remediation' => $alert['solution'],
                    'status' => 'open'
                ];
                
                $vulnerabilityModel->addVulnerability($vulnData);
                $addedVulns++;
            }
        }
        
        echo "Import terminé: $addedVulns vulnérabilités importées ($highCount élevées, $mediumCount moyennes, $lowCount faibles)\n";
        return true;
    } catch (Exception $e) {
        echo "Erreur lors de l'import XML ZAP: " . $e->getMessage() . "\n";
        return false;
    }
}

/**
 * Traite un rapport JSON ZAP
 */
function processZapJsonReport($filePath, $targetName) {
    global $scanModel, $vulnerabilityModel, $pipelineRunId;
    
    try {
        // Lire le fichier JSON
        $jsonContent = file_get_contents($filePath);
        $zapReport = json_decode($jsonContent, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Format JSON invalide: " . json_last_error_msg());
        }
        
        // Compter les vulnérabilités par sévérité
        $highCount = 0;
        $mediumCount = 0;
        $lowCount = 0;
        $totalCount = 0;
        
        // Structure du rapport JSON peut varier selon la version de ZAP
        $alerts = [];
        
        // Format standard du rapport JSON ZAP
        if (isset($zapReport['site'])) {
            // Traitement pour le format standard
            if (isset($zapReport['site'][0]['alerts'])) {
                $alertList = $zapReport['site'][0]['alerts'];
                foreach ($alertList as $alert) {
                    $totalCount++;
                    
                    $severity = mapZapSeverity($alert['riskdesc'] ?? $alert['risk']);
                    if ($severity === 'high') {
                        $highCount++;
                    } elseif ($severity === 'medium') {
                        $mediumCount++;
                    } elseif ($severity === 'low' || $severity === 'info') {
                        $lowCount++;
                    }
                    
                    $alerts[] = [
                        'name' => $alert['name'],
                        'severity' => $severity,
                        'description' => $alert['desc'] ?? $alert['description'] ?? '',
                        'solution' => $alert['solution'] ?? '',
                        'instances' => $alert['instances'] ?? []
                    ];
                }
            }
        } else if (isset($zapReport['alerts'])) {
            // Format alternatif
            foreach ($zapReport['alerts'] as $alert) {
                $totalCount++;
                
                $severity = mapZapSeverity($alert['risk']);
                if ($severity === 'high') {
                    $highCount++;
                } elseif ($severity === 'medium') {
                    $mediumCount++;
                } elseif ($severity === 'low' || $severity === 'info') {
                    $lowCount++;
                }
                
                $alerts[] = [
                    'name' => $alert['name'],
                    'severity' => $severity,
                    'description' => $alert['description'] ?? '',
                    'solution' => $alert['solution'] ?? '',
                    'instances' => $alert['instances'] ?? []
                ];
            }
        } else {
            throw new Exception("Format de rapport ZAP non reconnu");
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
            'tool_name' => 'owasp_zap',
            'target_name' => $targetName,
            'scan_status' => $scanStatus,
            'total_issues' => $totalCount,
            'high_severity_count' => $highCount,
            'medium_severity_count' => $mediumCount,
            'low_severity_count' => $lowCount,
            'raw_report' => [
                'alerts_count' => $totalCount
            ],
            'pipeline_run_id' => $pipelineRunId
        ];
        
        // Insérer le scan dans la base de données
        $scanId = $scanModel->addScan($scanData);
        echo "Scan ZAP ajouté avec succès (ID: $scanId)\n";
        
        // Traiter les vulnérabilités
        $addedVulns = 0;
        foreach ($alerts as $alert) {
            if (!empty($alert['instances'])) {
                foreach ($alert['instances'] as $instance) {
                    $uri = $instance['uri'] ?? $instance['url'] ?? 'Unknown';
                    $method = $instance['method'] ?? 'Unknown';
                    
                    $vulnData = [
                        'scan_id' => $scanId,
                        'tool_name' => 'owasp_zap',
                        'vulnerability_id' => null,
                        'title' => $alert['name'],
                        'description' => $alert['description'],
                        'severity' => $alert['severity'],
                        'category' => 'web',
                        'location' => $uri . ' (' . $method . ')',
                        'remediation' => $alert['solution'],
                        'status' => 'open'
                    ];
                    
                    $vulnerabilityModel->addVulnerability($vulnData);
                    $addedVulns++;
                }
            } else {
                // Cas où il n'y a pas d'instances détaillées
                $vulnData = [
                    'scan_id' => $scanId,
                    'tool_name' => 'owasp_zap',
                    'vulnerability_id' => null,
                    'title' => $alert['name'],
                    'description' => $alert['description'],
                    'severity' => $alert['severity'],
                    'category' => 'web',
                    'location' => 'Unknown location',
                    'remediation' => $alert['solution'],
                    'status' => 'open'
                ];
                
                $vulnerabilityModel->addVulnerability($vulnData);
                $addedVulns++;
            }
        }
        
        echo "Import terminé: $addedVulns vulnérabilités importées ($highCount élevées, $mediumCount moyennes, $lowCount faibles)\n";
        return true;
    } catch (Exception $e) {
        echo "Erreur lors de l'import JSON ZAP: " . $e->getMessage() . "\n";
        return false;
    }
}

// Déterminer le type de fichier et lancer le traitement approprié
$fileExtension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

echo "Démarrage de l'import du rapport ZAP: $filePath\n";
if ($fileExtension === 'xml') {
    if (processZapXmlReport($filePath, $targetName)) {
        echo "Import XML terminé avec succès.\n";
        exit(0);
    } else {
        echo "Échec de l'import XML.\n";
        exit(1);
    }
} elseif ($fileExtension === 'json') {
    if (processZapJsonReport($filePath, $targetName)) {
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