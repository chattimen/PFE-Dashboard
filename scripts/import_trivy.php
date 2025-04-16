<?php
/**
 * Script d'importation des résultats de Trivy
 * 
 * Ce script analyse le rapport JSON généré par Trivy et l'importe dans la base de données.
 * 
 * Utilisation:
 * php import_trivy.php chemin/vers/rapport.json [nom_de_la_cible]
 */

// Charger les dépendances
require_once __DIR__ . '/../backend/models/Database.php';
require_once __DIR__ . '/../backend/models/ScanModel.php';
require_once __DIR__ . '/../backend/models/VulnerabilityModel.php';

// Vérifier les arguments
if ($argc < 2) {
    echo "Usage: php import_trivy.php chemin/vers/rapport.json [nom_de_la_cible]\n";
    exit(1);
}

$filePath = $argv[1];
$targetName = $argc > 2 ? $argv[2] : basename($filePath, '.json');
$pipelineRunId = getenv('BUILD_BUILDID') ?: null;  // Récupère l'ID du pipeline Azure DevOps si disponible

// Vérifier l'existence du fichier
if (!file_exists($filePath)) {
    echo "Erreur: Le fichier '$filePath' n'existe pas.\n";
    exit(1);
}

// Lire le fichier JSON
$jsonContent = file_get_contents($filePath);
$trivyReport = json_decode($jsonContent, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo "Erreur: Format JSON invalide - " . json_last_error_msg() . "\n";
    exit(1);
}

// Initialiser les modèles
$scanModel = new ScanModel();
$vulnerabilityModel = new VulnerabilityModel();

/**
 * Fonction d'analyse du rapport Trivy
 */
function processTrivyReport($report, $targetName) {
    global $scanModel, $vulnerabilityModel, $pipelineRunId;
    
    // Compter les vulnérabilités par sévérité
    $highCount = 0;
    $mediumCount = 0;
    $lowCount = 0;
    $totalCount = 0;
    
    // Déterminer le statut du scan
    $scanStatus = 'success';
    
    // Pour les résultats de type container
    if (isset($report['Results'])) {
        foreach ($report['Results'] as $result) {
            if (isset($result['Vulnerabilities'])) {
                foreach ($result['Vulnerabilities'] as $vuln) {
                    $totalCount++;
                    
                    $severity = strtolower($vuln['Severity'] ?? 'unknown');
                    if ($severity === 'critical' || $severity === 'high') {
                        $highCount++;
                        $scanStatus = 'failed';
                    } elseif ($severity === 'medium') {
                        $mediumCount++;
                        if ($scanStatus !== 'failed') {
                            $scanStatus = 'warning';
                        }
                    } elseif ($severity === 'low') {
                        $lowCount++;
                    }
                }
            }
        }
    }
    // Pour les résultats de type filesystem
    elseif (isset($report['vulnerabilities'])) {
        foreach ($report['vulnerabilities'] as $vuln) {
            $totalCount++;
            
            $severity = strtolower($vuln['severity'] ?? 'unknown');
            if ($severity === 'critical' || $severity === 'high') {
                $highCount++;
                $scanStatus = 'failed';
            } elseif ($severity === 'medium') {
                $mediumCount++;
                if ($scanStatus !== 'failed') {
                    $scanStatus = 'warning';
                }
            } elseif ($severity === 'low') {
                $lowCount++;
            }
        }
    }
    
    // Créer l'entrée de scan
    $scanData = [
        'tool_name' => 'trivy',
        'target_name' => $targetName,
        'scan_status' => $scanStatus,
        'total_issues' => $totalCount,
        'high_severity_count' => $highCount,
        'medium_severity_count' => $mediumCount,
        'low_severity_count' => $lowCount,
        'raw_report' => $report,
        'pipeline_run_id' => $pipelineRunId
    ];
    
    // Insérer le scan dans la base de données
    try {
        $scanId = $scanModel->addScan($scanData);
        echo "Scan Trivy ajouté avec succès (ID: $scanId)\n";
        
        // Traiter les vulnérabilités
        if (isset($report['Results'])) {
            foreach ($report['Results'] as $result) {
                if (isset($result['Vulnerabilities'])) {
                    foreach ($result['Vulnerabilities'] as $vuln) {
                        $vulnData = [
                            'scan_id' => $scanId,
                            'tool_name' => 'trivy',
                            'vulnerability_id' => $vuln['VulnerabilityID'] ?? null,
                            'title' => $vuln['Title'] ?? $vuln['VulnerabilityID'] ?? 'Unknown',
                            'description' => $vuln['Description'] ?? null,
                            'severity' => strtolower($vuln['Severity'] ?? 'unknown'),
                            'category' => 'container',
                            'location' => $result['Target'] ?? $vuln['PkgName'] ?? null,
                            'remediation' => isset($vuln['FixedVersion']) ? "Mettre à jour vers la version {$vuln['FixedVersion']}" : null,
                            'status' => 'open'
                        ];
                        
                        $vulnerabilityModel->addVulnerability($vulnData);
                    }
                }
            }
        }
        elseif (isset($report['vulnerabilities'])) {
            foreach ($report['vulnerabilities'] as $vuln) {
                $vulnData = [
                    'scan_id' => $scanId,
                    'tool_name' => 'trivy',
                    'vulnerability_id' => $vuln['id'] ?? null,
                    'title' => $vuln['title'] ?? $vuln['id'] ?? 'Unknown',
                    'description' => $vuln['description'] ?? null,
                    'severity' => strtolower($vuln['severity'] ?? 'unknown'),
                    'category' => 'filesystem',
                    'location' => $vuln['package_name'] ?? null,
                    'remediation' => isset($vuln['fixed_version']) ? "Mettre à jour vers la version {$vuln['fixed_version']}" : null,
                    'status' => 'open'
                ];
                
                $vulnerabilityModel->addVulnerability($vulnData);
            }
        }
        
        echo "Import terminé: $totalCount vulnérabilités importées ($highCount critiques/élevées, $mediumCount moyennes, $lowCount faibles)\n";
        return true;
    } catch (Exception $e) {
        echo "Erreur lors de l'import: " . $e->getMessage() . "\n";
        return false;
    }
}

echo "Démarrage de l'import du rapport Trivy: $filePath\n";
if (processTrivyReport($trivyReport, $targetName)) {
    echo "Import terminé avec succès.\n";
    exit(0);
} else {
    echo "Échec de l'import.\n";
    exit(1);
}