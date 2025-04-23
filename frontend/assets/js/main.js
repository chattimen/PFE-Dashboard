/**
 * Script principal du dashboard de sécurité
 */

// Configuration globale
const API_BASE_URL = '/api';
let currentPage = 'dashboard';
let darkMode = localStorage.getItem('darkMode') === 'true';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Appliquer le thème
    updateTheme();
    
    // Gérer les changements d'onglets
    setupTabNavigation();
    
    // Initialiser les graphiques du dashboard principal
    if (document.getElementById('dashboard-page')) {
        initDashboard();
    }
    
    // Initialiser les pages spécifiques aux outils
    if (document.getElementById('trivy-page')) {
        initTrivyPage();
    }
    
    if (document.getElementById('sonarqube-page')) {
        initSonarQubePage();
    }
    
    if (document.getElementById('zap-page')) {
        initZapPage();
    }
    
    if (document.getElementById('selenium-page')) {
        initSeleniumPage();
    }
    
    // Initialiser les contrôles globaux
    initGlobalControls();
});

/**
 * Configuration de la navigation par onglets
 */
function setupTabNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Récupérer l'identifiant de la page cible
            const targetPage = this.getAttribute('data-page');
            
            // Masquer toutes les pages
            document.querySelectorAll('.page-content').forEach(page => {
                page.style.display = 'none';
            });
            
            // Afficher la page demandée
            document.getElementById(`${targetPage}-page`).style.display = 'block';
            
            // Mettre à jour la navigation
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });
            this.classList.add('active');
            
            // Mettre à jour la page courante
            currentPage = targetPage;
            
            // Initialiser la page si nécessaire
            if (targetPage === 'dashboard') {
                initDashboard();
            } else if (targetPage === 'trivy') {
                initTrivyPage();
            } else if (targetPage === 'sonarqube') {
                initSonarQubePage();
            } else if (targetPage === 'zap') {
                initZapPage();
            } else if (targetPage === 'selenium') {
                initSeleniumPage();
            } else if (targetPage === 'settings') {
                initSettingsPage();
            }
        });
    });
}

/**
 * Initialisation des contrôles globaux (filtres de date, etc.)
 */
function initGlobalControls() {
    // Gestion du sélecteur de période
    const periodSelector = document.getElementById('period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            // Recharger les données avec la nouvelle période
            if (currentPage === 'dashboard') {
                initDashboard();
            } else if (currentPage === 'trivy') {
                initTrivyPage();
            } else if (currentPage === 'sonarqube') {
                initSonarQubePage();
            } else if (currentPage === 'zap') {
                initZapPage();
            } else if (currentPage === 'selenium') {
                initSeleniumPage();
            }
        });
    }
    
    // Gestion du bouton de thème sombre/clair
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            darkMode = !darkMode;
            localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
            updateTheme();
        });
    }
}

/**
 * Met à jour le thème (sombre/clair)
 */
function updateTheme() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.querySelectorAll('.chart-container').forEach(chart => {
            chart.classList.add('dark');
        });
    } else {
        document.body.classList.remove('dark-mode');
        document.querySelectorAll('.chart-container').forEach(chart => {
            chart.classList.remove('dark');
        });
    }
    
    // Mettre à jour les graphiques si nécessaire
    if (window.vulnerabilityChart) {
        updateChartTheme(window.vulnerabilityChart);
    }
    if (window.scanTrendsChart) {
        updateChartTheme(window.scanTrendsChart);
    }
}

/**
 * Initialisation de la page du tableau de bord principal
 */
function initDashboard() {
    // Récupérer la période sélectionnée
    const periodSelector = document.getElementById('period-selector');
    const days = periodSelector ? parseInt(periodSelector.value) : 30;
    
    // Charger les données pour les graphiques
    loadVulnerabilityStats(days);
    loadScanStats(days);
    loadVulnerabilityTrends(days);
    loadScanTrends(days);
    
    // Charger les derniers scans pour chaque outil
    loadLatestScans();
}

/**
 * Chargement des statistiques des vulnérabilités
 */
function loadVulnerabilityStats(days = 30) {
    fetch(`${API_BASE_URL}/vulnerabilities/stats?days=${days}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateVulnerabilityStatsUI(data.data);
            } else {
                console.error('Erreur lors du chargement des statistiques de vulnérabilités:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Mise à jour de l'interface avec les statistiques de vulnérabilités
 */
function updateVulnerabilityStatsUI(stats) {
    // Compteurs par sévérité
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    // Agréger les données
    stats.forEach(stat => {
        if (stat.status === 'open') {
            if (stat.severity === 'critical') {
                criticalCount += parseInt(stat.count);
            } else if (stat.severity === 'high') {
                highCount += parseInt(stat.count);
            } else if (stat.severity === 'medium') {
                mediumCount += parseInt(stat.count);
            } else if (stat.severity === 'low') {
                lowCount += parseInt(stat.count);
            }
        }
    });
    
    // Mettre à jour les compteurs dans l'interface
    document.getElementById('critical-count').textContent = criticalCount;
    document.getElementById('high-count').textContent = highCount;
    document.getElementById('medium-count').textContent = mediumCount;
    document.getElementById('low-count').textContent = lowCount;
    document.getElementById('total-count').textContent = criticalCount + highCount + mediumCount + lowCount;
    
    // Mettre à jour le graphique de répartition
    updateVulnerabilityDistributionChart(criticalCount, highCount, mediumCount, lowCount);
}

/**
 * Mise à jour du graphique de distribution des vulnérabilités
 */
function updateVulnerabilityDistributionChart(critical, high, medium, low) {
    const ctx = document.getElementById('vulnerability-distribution-chart').getContext('2d');
    
    // Supprimer l'ancien graphique s'il existe
    if (window.vulnerabilityChart) {
        window.vulnerabilityChart.destroy();
    }
    
    // Créer le nouveau graphique
    window.vulnerabilityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critique', 'Élevée', 'Moyenne', 'Faible'],
            datasets: [{
                data: [critical, high, medium, low],
                backgroundColor: [
                    '#d81b60', // Rouge
                    '#e65100', // Orange
                    '#ffc107', // Jaune
                    '#2196f3'  // Bleu
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: darkMode ? '#ffffff' : '#333333'
                    }
                },
                title: {
                    display: true,
                    text: 'Distribution des vulnérabilités par sévérité',
                    color: darkMode ? '#ffffff' : '#333333'
                }
            }
        }
    });
}

/**
 * Chargement des tendances des vulnérabilités
 */
function loadVulnerabilityTrends(days = 30) {
    fetch(`${API_BASE_URL}/vulnerabilities/trends?days=${days}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateVulnerabilityTrendsChart(data.data);
            } else {
                console.error('Erreur lors du chargement des tendances:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Mise à jour du graphique des tendances de vulnérabilités
 */
function updateVulnerabilityTrendsChart(trends) {
    const ctx = document.getElementById('vulnerability-trends-chart').getContext('2d');
    
    // Préparation des données
    const labels = trends.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString();
    });
    
    const criticalData = trends.map(item => item.critical);
    const highData = trends.map(item => item.high);
    const mediumData = trends.map(item => item.medium);
    const lowData = trends.map(item => item.low);
    
    // Supprimer l'ancien graphique s'il existe
    if (window.vulnerabilityTrendsChart) {
        window.vulnerabilityTrendsChart.destroy();
    }
    
    // Créer le nouveau graphique
    window.vulnerabilityTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Critique',
                    data: criticalData,
                    backgroundColor: 'rgba(216, 27, 96, 0.2)',
                    borderColor: '#d81b60',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Élevée',
                    data: highData,
                    backgroundColor: 'rgba(230, 81, 0, 0.2)',
                    borderColor: '#e65100',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Moyenne',
                    data: mediumData,
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    borderColor: '#ffc107',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Faible',
                    data: lowData,
                    backgroundColor: 'rgba(33, 150, 243, 0.2)',
                    borderColor: '#2196f3',
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    grid: {
                        color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: darkMode ? '#ffffff' : '#333333'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: darkMode ? '#ffffff' : '#333333'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: darkMode ? '#ffffff' : '#333333'
                    }
                },
                title: {
                    display: true,
                    text: 'Évolution des vulnérabilités au cours du temps',
                    color: darkMode ? '#ffffff' : '#333333'
                }
            }
        }
    });
}

/**
 * Adaptation d'un graphique au thème actuel
 */
function updateChartTheme(chart) {
    // Mettre à jour les couleurs du graphique en fonction du thème
    chart.options.plugins.legend.labels.color = darkMode ? '#ffffff' : '#333333';
    chart.options.plugins.title.color = darkMode ? '#ffffff' : '#333333';
    
    if (chart.options.scales) {
        if (chart.options.scales.x) {
            chart.options.scales.x.grid.color = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            chart.options.scales.x.ticks.color = darkMode ? '#ffffff' : '#333333';
        }
        if (chart.options.scales.y) {
            chart.options.scales.y.grid.color = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            chart.options.scales.y.ticks.color = darkMode ? '#ffffff' : '#333333';
        }
    }
    
    chart.update();
}

// Fonctions pour les autres pages (Trivy, SonarQube, etc.)
// Ces fonctions seront implémentées selon les besoins spécifiques

/**
 * Initialisation de la page Trivy
 */
function initTrivyPage() {
    // Charger les vulnérabilités de Trivy
    fetchVulnerabilities('trivy');
    
    // Charger l'historique des scans Trivy
    fetchScanHistory('trivy');
}

/**
 * Initialisation de la page SonarQube
 */
function initSonarQubePage() {
    // Charger les vulnérabilités de SonarQube
    fetchVulnerabilities('sonarqube');
    
    // Charger l'historique des scans SonarQube
    fetchScanHistory('sonarqube');
}

/**
 * Initialisation de la page OWASP ZAP
 */
function initZapPage() {
    // Charger les vulnérabilités de ZAP
    fetchVulnerabilities('owasp_zap');
    
    // Charger l'historique des scans ZAP
    fetchScanHistory('owasp_zap');
}

/**
 * Initialisation de la page Selenium
 */
function initSeleniumPage() {
    // Charger les tests Selenium
    fetchScanHistory('selenium');
}

/**
 * Récupération des vulnérabilités par outil
 */
function fetchVulnerabilities(toolName, limit = 50, offset = 0) {
    fetch(`${API_BASE_URL}/vulnerabilities?tool_name=${toolName}&limit=${limit}&offset=${offset}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateVulnerabilitiesTable(data.data, toolName);
            } else {
                console.error(`Erreur lors du chargement des vulnérabilités ${toolName}:`, data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Mise à jour de la table des vulnérabilités
 */
function updateVulnerabilitiesTable(vulnerabilities, toolName) {
    const tableId = `${toolName}-vulnerabilities-table`;
    const tableBody = document.querySelector(`#${tableId} tbody`);
    
    if (!tableBody) {
        console.error(`Table body non trouvé pour ${tableId}`);
        return;
    }
    
    // Vider la table
    tableBody.innerHTML = '';
    
    // Remplir avec les nouvelles données
    vulnerabilities.forEach(vuln => {
        const row = document.createElement('tr');
        
        // Définir la classe de sévérité
        row.classList.add(`severity-${vuln.severity}`);
        
        row.innerHTML = `
            <td>${vuln.title}</td>
            <td><span class="badge severity-${vuln.severity}">${formatSeverity(vuln.severity)}</span></td>
            <td>${vuln.location || 'N/A'}</td>
            <td>${vuln.category || 'N/A'}</td>
            <td>${formatDate(vuln.last_detected)}</td>
            <td><span class="badge status-${vuln.status}">${formatStatus(vuln.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewVulnerabilityDetails(${vuln.id})">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="updateVulnerabilityStatus(${vuln.id}, 'fixed')">
                    <i class="fas fa-check"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Mettre à jour le compteur
    const countElement = document.getElementById(`${toolName}-vulnerability-count`);
    if (countElement) {
        countElement.textContent = vulnerabilities.length;
    }
}

/**
 * Formatage de la sévérité pour l'affichage
 */
function formatSeverity(severity) {
    switch (severity.toLowerCase()) {
        case 'critical':
            return 'Critique';
        case 'high':
            return 'Élevée';
        case 'medium':
            return 'Moyenne';
        case 'low':
            return 'Faible';
        case 'info':
            return 'Info';
        default:
            return 'Inconnue';
    }
}

/**
 * Formatage du statut pour l'affichage
 */
function formatStatus(status) {
    switch (status.toLowerCase()) {
        case 'open':
            return 'Ouverte';
        case 'fixed':
            return 'Corrigée';
        case 'false_positive':
            return 'Faux positif';
        case 'accepted_risk':
            return 'Risque accepté';
        default:
            return 'Inconnue';
    }
}

/**
 * Formatage d'une date pour l'affichage
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Affichage des détails d'une vulnérabilité
 */
function viewVulnerabilityDetails(id) {
    fetch(`${API_BASE_URL}/vulnerabilities/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showVulnerabilityModal(data.data);
            } else {
                console.error('Erreur lors du chargement des détails:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Affichage d'une modal avec les détails d'une vulnérabilité
 */
function showVulnerabilityModal(vuln) {
    // Créer ou récupérer la modal
    let modal = document.getElementById('vulnerability-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vulnerability-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Contenu de la modal
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${vuln.title}</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="vulnerability-details">
                    <p><strong>ID:</strong> ${vuln.vulnerability_id || 'N/A'}</p>
                    <p><strong>Sévérité:</strong> <span class="badge severity-${vuln.severity}">${formatSeverity(vuln.severity)}</span></p>
                    <p><strong>Statut:</strong> <span class="badge status-${vuln.status}">${formatStatus(vuln.status)}</span></p>
                    <p><strong>Outil:</strong> ${formatToolName(vuln.tool_name)}</p>
                    <p><strong>Emplacement:</strong> ${vuln.location || 'N/A'}</p>
                    <p><strong>Catégorie:</strong> ${vuln.category || 'N/A'}</p>
                    <p><strong>Détectée:</strong> ${formatDate(vuln.first_detected)}</p>
                    <p><strong>Dernière détection:</strong> ${formatDate(vuln.last_detected)}</p>
                    
                    <h3>Description</h3>
                    <div class="description-box">
                        ${vuln.description || 'Aucune description disponible'}
                    </div>
                    
                    <h3>Recommandation</h3>
                    <div class="remediation-box">
                        ${vuln.remediation || 'Aucune recommandation disponible'}
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="updateVulnerabilityStatus(${vuln.id}, 'fixed')">Marquer comme corrigé</button>
                    <button class="btn btn-warning" onclick="updateVulnerabilityStatus(${vuln.id}, 'false_positive')">Faux positif</button>
                    <button class="btn btn-secondary" onclick="updateVulnerabilityStatus(${vuln.id}, 'accepted_risk')">Risque accepté</button>
                </div>
            </div>
        </div>
    `;
    
    // Afficher la modal
    modal.style.display = 'block';
    
    // Gestion de la fermeture
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Fermer si on clique en dehors de la modal
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

/**
 * Formatage du nom de l'outil pour l'affichage
 */
function formatToolName(toolName) {
    switch (toolName.toLowerCase()) {
        case 'trivy':
            return 'Trivy';
        case 'sonarqube':
            return 'SonarQube';
        case 'owasp_zap':
            return 'OWASP ZAP';
        case 'selenium':
            return 'Selenium';
        default:
            return toolName;
    }
}

/**
 * Mise à jour du statut d'une vulnérabilité
 */
function updateVulnerabilityStatus(id, newStatus) {
    fetch(`${API_BASE_URL}/vulnerabilities/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: newStatus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Fermer la modal si elle est ouverte
            const modal = document.getElementById('vulnerability-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // Recharger les données actuelles
            if (currentPage === 'dashboard') {
                initDashboard();
            } else if (currentPage === 'trivy') {
                initTrivyPage();
            } else if (currentPage === 'sonarqube') {
                initSonarQubePage();
            } else if (currentPage === 'zap') {
                initZapPage();
            }
            
            // Afficher une notification
            showNotification(`Vulnérabilité mise à jour avec succès`, 'success');
        } else {
            console.error('Erreur lors de la mise à jour:', data.message);
            showNotification(`Erreur: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur lors de la requête API:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    });
}

/**
 * Récupération de l'historique des scans par outil
 */
function fetchScanHistory(toolName, limit = 10) {
    fetch(`${API_BASE_URL}/scans?tool_name=${toolName}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateScanHistoryTable(data.data, toolName);
            } else {
                console.error(`Erreur lors du chargement de l'historique des scans ${toolName}:`, data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Mise à jour de la table d'historique des scans
 */
function updateScanHistoryTable(scans, toolName) {
    const tableId = `${toolName}-history-table`;
    const tableBody = document.querySelector(`#${tableId} tbody`);
    
    if (!tableBody) {
        console.error(`Table body non trouvé pour ${tableId}`);
        return;
    }
    
    // Vider la table
    tableBody.innerHTML = '';
    
    // Remplir avec les nouvelles données
    scans.forEach(scan => {
        const row = document.createElement('tr');
        
        // Définir la classe de statut
        row.classList.add(`status-${scan.scan_status}`);
        
        row.innerHTML = `
            <td>${formatDate(scan.scan_date)}</td>
            <td>${scan.target_name}</td>
            <td><span class="badge status-${scan.scan_status}">${formatScanStatus(scan.scan_status)}</span></td>
            <td>${scan.total_issues}</td>
            <td>${scan.high_severity_count}</td>
            <td>${scan.medium_severity_count}</td>
            <td>${scan.low_severity_count}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewScanDetails(${scan.id})">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Formatage du statut d'un scan pour l'affichage
 */
function formatScanStatus(status) {
    switch (status.toLowerCase()) {
        case 'success':
            return 'Succès';
        case 'warning':
            return 'Avertissement';
        case 'failed':
            return 'Échec';
        default:
            return 'Inconnu';
    }
}

/**
 * Chargement des statistiques des scans
 */
function loadScanStats(days = 30) {
    fetch(`${API_BASE_URL}/scans/stats?days=${days}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateScanStatsUI(data.data);
            } else {
                console.error('Erreur lors du chargement des statistiques de scans:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Mise à jour de l'interface avec les statistiques de scans
 */
function updateScanStatsUI(stats) {
    // Mettre à jour les compteurs dans l'interface pour chaque outil
    stats.forEach(stat => {
        const toolName = stat.tool_name.toLowerCase();
        
        // Mettre à jour le nombre total de scans
        const scanCountElement = document.getElementById(`${toolName}-scan-count`);
        if (scanCountElement) {
            scanCountElement.textContent = stat.total_scans;
        }
        
        // Mettre à jour le taux de succès
        const successRateElement = document.getElementById(`${toolName}-success-rate`);
        if (successRateElement) {
            const successRate = (stat.success_count / stat.total_scans * 100).toFixed(1);
            successRateElement.textContent = `${successRate}%`;
        }
    });
}

/**
 * Chargement des tendances des scans
 */
function loadScanTrends(days = 30) {
    fetch(`${API_BASE_URL}/scans/trends?days=${days}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateScanTrendsChart(data.data);
            } else {
                console.error('Erreur lors du chargement des tendances de scans:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Mise à jour du graphique des tendances de scans
 */
function updateScanTrendsChart(trends) {
    const ctx = document.getElementById('scan-trends-chart').getContext('2d');
    
    // Préparation des données
    const labels = trends.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString();
    });
    
    const trivyData = trends.map(item => item.trivy_scans);
    const sonarData = trends.map(item => item.sonarqube_scans);
    const zapData = trends.map(item => item.zap_scans);
    const seleniumData = trends.map(item => item.selenium_scans);
    
    // Supprimer l'ancien graphique s'il existe
    if (window.scanTrendsChart) {
        window.scanTrendsChart.destroy();
    }
    
    // Créer le nouveau graphique
    window.scanTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Trivy',
                    data: trivyData,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: '#4caf50',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'SonarQube',
                    data: sonarData,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: '#2196f3',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'OWASP ZAP',
                    data: zapData,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: '#f44336',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Selenium',
                    data: seleniumData,
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderColor: '#ff9800',
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    grid: {
                        color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: darkMode ? '#ffffff' : '#333333'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: darkMode ? '#ffffff' : '#333333'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: darkMode ? '#ffffff' : '#333333'
                    }
                },
                title: {
                    display: true,
                    text: 'Évolution des scans au cours du temps',
                    color: darkMode ? '#ffffff' : '#333333'
                }
            }
        }
    });
}

/**
 * Chargement des derniers scans pour toutes les catégories
 */
function loadLatestScans() {
    fetch(`${API_BASE_URL}/scans?limit=10`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateLatestScansTable(data.data);
            } else {
                console.error('Erreur lors du chargement des derniers scans:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Mise à jour du tableau des derniers scans
 */
function updateLatestScansTable(scans) {
    const tableBody = document.querySelector('#latest-scans-table tbody');
    
    if (!tableBody) {
        console.error('Table body des derniers scans non trouvé');
        return;
    }
    
    // Vider la table
    tableBody.innerHTML = '';
    
    // Remplir avec les nouvelles données
    scans.forEach(scan => {
        const row = document.createElement('tr');
        
        // Définir la classe de statut
        row.classList.add(`status-${scan.scan_status}`);
        
        row.innerHTML = `
            <td>${formatDate(scan.scan_date)}</td>
            <td>${formatToolName(scan.tool_name)}</td>
            <td>${scan.target_name}</td>
            <td><span class="badge status-${scan.scan_status}">${formatScanStatus(scan.scan_status)}</span></td>
            <td>${scan.total_issues}</td>
            <td>${scan.high_severity_count}</td>
            <td>${scan.medium_severity_count}</td>
            <td>${scan.low_severity_count}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewScanDetails(${scan.id})">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Affichage des détails d'un scan
 */
function viewScanDetails(id) {
    fetch(`${API_BASE_URL}/scans/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showScanModal(data.data);
            } else {
                console.error('Erreur lors du chargement des détails du scan:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
        });
}

/**
 * Affichage d'une modal avec les détails d'un scan
 */
function showScanModal(scan) {
    // Créer ou récupérer la modal
    let modal = document.getElementById('scan-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'scan-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Contenu de la modal
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Détails du scan : ${scan.target_name}</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="scan-details">
                    <p><strong>Date:</strong> ${formatDate(scan.scan_date)}</p>
                    <p><strong>Outil:</strong> ${formatToolName(scan.tool_name)}</p>
                    <p><strong>Statut:</strong> <span class="badge status-${scan.scan_status}">${formatScanStatus(scan.scan_status)}</span></p>
                    <p><strong>Total des problèmes:</strong> ${scan.total_issues}</p>
                    <p><strong>Problèmes critiques/élevés:</strong> ${scan.high_severity_count}</p>
                    <p><strong>Problèmes moyens:</strong> ${scan.medium_severity_count}</p>
                    <p><strong>Problèmes faibles:</strong> ${scan.low_severity_count}</p>
                    <p><strong>ID d'exécution:</strong> ${scan.pipeline_run_id || 'N/A'}</p>
                </div>
                
                <div class="mt-2">
                    <button class="btn btn-primary" onclick="showScanVulnerabilities(${scan.id})">Voir les vulnérabilités</button>
                    <button class="btn btn-info" onclick="exportScanReport(${scan.id})">Exporter le rapport</button>
                </div>
            </div>
        </div>
    `;
    
    // Afficher la modal
    modal.style.display = 'block';
    
    // Gestion de la fermeture
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Fermer si on clique en dehors de la modal
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

/**
 * Affiche les vulnérabilités liées à un scan
 */
function showScanVulnerabilities(scanId) {
    fetch(`${API_BASE_URL}/vulnerabilities?scan_id=${scanId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Fermer la modal actuelle
                const scanModal = document.getElementById('scan-modal');
                if (scanModal) {
                    scanModal.style.display = 'none';
                }
                
                // Créer une nouvelle modal pour les vulnérabilités
                let modal = document.getElementById('vulnerabilities-list-modal');
                
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'vulnerabilities-list-modal';
                    modal.className = 'modal';
                    document.body.appendChild(modal);
                }
                
                // Générer le HTML pour la liste des vulnérabilités
                let vulnerabilitiesHTML = '';
                data.data.forEach(vuln => {
                    vulnerabilitiesHTML += `
                        <tr class="severity-${vuln.severity}">
                            <td>${vuln.title}</td>
                            <td><span class="badge severity-${vuln.severity}">${formatSeverity(vuln.severity)}</span></td>
                            <td>${vuln.location || 'N/A'}</td>
                            <td>${vuln.category || 'N/A'}</td>
                            <td><span class="badge status-${vuln.status}">${formatStatus(vuln.status)}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="viewVulnerabilityDetails(${vuln.id})">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                // Contenu de la modal
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Vulnérabilités du scan</h2>
                            <span class="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Titre</th>
                                            <th>Sévérité</th>
                                            <th>Emplacement</th>
                                            <th>Catégorie</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${vulnerabilitiesHTML}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                
                // Afficher la modal
                modal.style.display = 'block';
                
                // Gestion de la fermeture
                const closeBtn = modal.querySelector('.close-modal');
                closeBtn.onclick = function() {
                    modal.style.display = 'none';
                };
                
                // Fermer si on clique en dehors de la modal
                window.onclick = function(event) {
                    if (event.target === modal) {
                        modal.style.display = 'none';
                    }
                };
            } else {
                console.error('Erreur lors du chargement des vulnérabilités:', data.message);
                showNotification('Erreur lors du chargement des vulnérabilités', 'error');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
            showNotification('Erreur de connexion au serveur', 'error');
        });
}

/**
 * Exporte le rapport d'un scan
 */
function exportScanReport(scanId) {
    fetch(`${API_BASE_URL}/scans/${scanId}/export`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Échec de l\'exportation');
            }
            return response.blob();
        })
        .then(blob => {
            // Créer un lien pour le téléchargement
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `rapport-scan-${scanId}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            showNotification('Rapport exporté avec succès', 'success');
        })
        .catch(error => {
            console.error('Erreur lors de l\'exportation du rapport:', error);
            showNotification('Erreur lors de l\'exportation du rapport', 'error');
        });
}

/**
 * Affichage d'une notification
 */
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Ajouter au conteneur de notifications
    const container = document.getElementById('notification-container');
    if (!container) {
        // Créer le conteneur s'il n'existe pas
        const newContainer = document.createElement('div');
        newContainer.id = 'notification-container';
        document.body.appendChild(newContainer);
        newContainer.appendChild(notification);
    } else {
        container.appendChild(notification);
    }
    
    // Gérer la fermeture
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', function() {
        notification.remove();
    });
    
    // Disparaître après 5 secondes
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}
// Ajouter un gestionnaire d'événement pour le lien de téléchargement
document.addEventListener('DOMContentLoaded', function() {
    const downloadLink = document.getElementById('download-report');
    if (downloadLink) {
        downloadLink.addEventListener('click', function(e) {
            e.preventDefault(); // Empêcher le comportement par défaut du lien
            downloadDashboardReport();
        });
    }
});