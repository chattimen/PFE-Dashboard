/**
 * Script principal du dashboard de sécurité
 */

// Configuration globale
const API_BASE_URL = '/api';
let currentPage = 'dashboard';
let darkMode = localStorage.getItem('darkMode') === 'true';
let zapDataLoaded = false;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Appliquer le thème
    updateTheme();
    
    // Gérer les changements d'onglets
    setupTabNavigation();
    
    // Initialiser les pages spécifiques uniquement si elles sont présentes
    if (document.getElementById('dashboard-page')) {
        initDashboard();
    }
    
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
            if (!targetPage) return;
            
            // Masquer toutes les pages
            document.querySelectorAll('.page-content').forEach(page => {
                page.style.display = 'none';
            });
            
            // Vérifier si la page cible existe
            const targetElement = document.getElementById(`${targetPage}-page`);
            if (targetElement) {
                // Afficher la page demandée
                targetElement.style.display = 'block';
                
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
            } else {
                console.warn(`La page ${targetPage} n'existe pas dans le DOM`);
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
    
    // Vérifier si les éléments requis existent avant de charger les données
    if (document.getElementById('vulnerability-distribution-chart')) {
        // Modification : Appel à une nouvelle fonction pour charger les vulnérabilités 
        // du dernier scan uniquement
        loadLatestScanVulnerabilityStats();
    }
    
    if (document.getElementById('scan-trends-chart')) {
        loadScanStats(days);
        loadScanTrends(days);
    }
    
    if (document.getElementById('vulnerability-trends-chart')) {
        loadVulnerabilityTrends(days);
    }
    
    if (document.getElementById('latest-scans-table')) {
        loadLatestScans();
    }
}

/**
 * Fonction utilitaire pour vérifier si un élément existe
 */
function elementExists(id) {
    return document.getElementById(id) !== null;
}

/**
 * NOUVELLE FONCTION : Chargement des statistiques des vulnérabilités du dernier scan uniquement
 */
function loadLatestScanVulnerabilityStats() {
    // D'abord, récupérer le dernier scan
    fetch(`${API_BASE_URL}/scans?limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.data.length > 0) {
                const latestScan = data.data[0];
                
                // Mise à jour des compteurs dans l'interface
                const criticalElement = document.getElementById('critical-count');
                if (criticalElement) criticalElement.textContent = latestScan.critical_count || 0;
                
                const highElement = document.getElementById('high-count');
                if (highElement) highElement.textContent = latestScan.high_severity_count || 0;
                
                const mediumElement = document.getElementById('medium-count');
                if (mediumElement) mediumElement.textContent = latestScan.medium_severity_count || 0;
                
                const lowElement = document.getElementById('low-count');
                if (lowElement) lowElement.textContent = latestScan.low_severity_count || 0;
                
                const totalElement = document.getElementById('total-count');
                if (totalElement) totalElement.textContent = latestScan.total_issues || 0;
                
                // Mettre à jour le graphique de répartition s'il existe
                if (document.getElementById('vulnerability-distribution-chart')) {
                    updateVulnerabilityDistributionChart(
                        latestScan.critical_count || 0,
                        latestScan.high_severity_count || 0,
                        latestScan.medium_severity_count || 0,
                        latestScan.low_severity_count || 0
                    );
                }
                
                // Si nécessaire, charger les vulnérabilités spécifiques de ce scan
                if (latestScan.id) {
                    loadScanVulnerabilities(latestScan.id);
                }
            } else {
                console.error('Erreur lors du chargement du dernier scan ou aucun scan trouvé');
                // En cas d'échec, nous utilisons la méthode existante comme fallback
                loadVulnerabilityStats();
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
            // Fallback en cas d'erreur
            loadVulnerabilityStats();
        });
}

/**
 * NOUVELLE FONCTION : Charge les vulnérabilités d'un scan spécifique
 */
function loadScanVulnerabilities(scanId) {
    fetch(`${API_BASE_URL}/vulnerabilities?scan_id=${scanId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Ici, vous pouvez mettre à jour d'autres éléments de l'interface
                // avec les vulnérabilités spécifiques, si nécessaire
                console.log(`Chargement de ${data.data.length} vulnérabilités pour le scan ${scanId}`);
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des vulnérabilités du scan:', error);
        });
}

/**
 * Chargement des statistiques des vulnérabilités (méthode existante, gardée comme fallback)
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
            // Afficher un message d'erreur à l'utilisateur pour les erreurs API
            showNotification('Erreur de connexion à l\'API. Vérifiez que le serveur est bien en marche.', 'error');
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
    
    // Mettre à jour les compteurs dans l'interface (avec vérification)
    const criticalElement = document.getElementById('critical-count');
    if (criticalElement) criticalElement.textContent = criticalCount;
    
    const highElement = document.getElementById('high-count');
    if (highElement) highElement.textContent = highCount;
    
    const mediumElement = document.getElementById('medium-count');
    if (mediumElement) mediumElement.textContent = mediumCount;
    
    const lowElement = document.getElementById('low-count');
    if (lowElement) lowElement.textContent = lowCount;
    
    const totalElement = document.getElementById('total-count');
    if (totalElement) totalElement.textContent = criticalCount + highCount + mediumCount + lowCount;
    
    // Mettre à jour le graphique de répartition s'il existe
    if (document.getElementById('vulnerability-distribution-chart')) {
        updateVulnerabilityDistributionChart(criticalCount, highCount, mediumCount, lowCount);
    }
}

/**
 * Mise à jour du graphique de distribution des vulnérabilités
 */
function updateVulnerabilityDistributionChart(critical, high, medium, low) {
    const chartElement = document.getElementById('vulnerability-distribution-chart');
    if (!chartElement) {
        console.warn('Élément de graphique vulnerability-distribution-chart non trouvé');
        return;
    }
    
    const ctx = chartElement.getContext('2d');
    
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
    const chartElement = document.getElementById('vulnerability-trends-chart');
    if (!chartElement) {
        console.warn('Élément de graphique vulnerability-trends-chart non trouvé');
        return;
    }
    
    const ctx = chartElement.getContext('2d');
    
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
    if (!chart) return;
    
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
    // Charger les vulnérabilités de ZAP si la table existe
    if (document.querySelector('#zap-vulnerabilities-table-body')) {
        fetchVulnerabilities('zap');
    }
    
    // Charger l'historique des scans ZAP si la table existe
    if (document.querySelector('#zap-history-table-body')) {
        fetchScanHistory('zap');
    }
    
    // Initialiser la partie spécifique à ZAP si la fonction existe
    if (typeof loadZapData === 'function') {
        loadZapData();
    }
}

/**
 * Initialisation de la page Selenium
 */
function initSeleniumPage() {
    // Charger les tests Selenium si la table existe
    if (document.querySelector('#selenium-history-table tbody')) {
        fetchScanHistory('selenium');
    }
}

// Variables pour la pagination
const paginationState = {
    trivy: { currentPage: 1 },
    sonarqube: { currentPage: 1 },
    zap: { currentPage: 1 },
    selenium: { currentPage: 1 }
};
const itemsPerPage = 10; // Nombre d'éléments par page

/**
 * Récupération des vulnérabilités par outil avec pagination
 */
function fetchVulnerabilities(toolName, limit = itemsPerPage, offset = (paginationState[toolName].currentPage - 1) * itemsPerPage) {
    // Pour la compatibilité avec le backend, convertir 'zap' en 'owasp_zap' pour l'API
    const apiToolName = toolName === 'zap' ? 'owasp_zap' : toolName;
    
    // Récupérer les filtres s'ils existent
    const severityFilter = document.getElementById(`${toolName}-severity-filter`);
    const statusFilter = document.getElementById(`${toolName}-status-filter`);
    const projectFilter = document.getElementById(`${toolName}-project-filter`); // Pour SonarQube
    
    let severityParam = '';
    let statusParam = '';
    let projectParam = '';
    
    if (severityFilter && severityFilter.value) {
        severityParam = `&severity=${severityFilter.value}`;
    }
    
    if (statusFilter && statusFilter.value) {
        statusParam = `&status=${statusFilter.value}`;
    }
    
    if (projectFilter && projectFilter.value) {
        projectParam = `&project_id=${projectFilter.value}`;
    }
    
    fetch(`${API_BASE_URL}/vulnerabilities?tool_name=${apiToolName}&limit=${limit}&offset=${offset}${severityParam}${statusParam}${projectParam}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateVulnerabilitiesTable(data.data, toolName);
                
                // Mettre à jour le compteur de pagination
                updatePaginationInfo(toolName, data.total || data.data.length, toolName);
            } else {
                console.error(`Erreur lors du chargement des vulnérabilités ${toolName}:`, data.message);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
            showNotification(`Erreur lors du chargement des vulnérabilités ${toolName}`, 'error');
        });
}

/**
 * NOUVELLE FONCTION: Met à jour les informations de pagination
 */
function updatePaginationInfo(toolName, totalItems) {
    const currentPage = paginationState[toolName].currentPage;
    const paginationInfo = document.getElementById(`${toolName}-page-info`);
    
    if (paginationInfo) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        paginationInfo.textContent = `Page ${currentPage} sur ${totalPages || 1}`;
        
        // Mise à jour des boutons de pagination
        const prevButton = document.getElementById(`${toolName}-prev-page`);
        const nextButton = document.getElementById(`${toolName}-next-page`);
        
        if (prevButton) {
            prevButton.disabled = currentPage <= 1;
        }
        
        if (nextButton) {
            nextButton.disabled = currentPage >= totalPages;
        }
    }
    
    // Également mettre à jour les infos de pagination pour l'historique si elles existent
    const historyPaginationInfo = document.getElementById(`${toolName}-history-page-info`);
    if (historyPaginationInfo) {
        // Utiliser totalItems et currentPage pour l'historique
        // Dans un système réel, on pourrait avoir des variables distinctes pour l'historique
        historyPaginationInfo.textContent = `Page ${currentPage} sur ${totalPages || 1}`;
        
        const historyPrevButton = document.getElementById(`${toolName}-history-prev-page`);
        const historyNextButton = document.getElementById(`${toolName}-history-next-page`);
        
        if (historyPrevButton) {
            historyPrevButton.disabled = currentPage <= 1;
        }
        
        if (historyNextButton) {
            historyNextButton.disabled = currentPage >= totalPages;
        }
    }
}

/**
 * Mise à jour de la table des vulnérabilités
 */
function updateVulnerabilitiesTable(vulnerabilities, toolName) {
    const tableId = `${toolName}-vulnerabilities-table`;
    const tableBody = document.querySelector(`#${tableId} tbody`);
    
    if (!tableBody) {
        console.warn(`Table body non trouvé pour ${tableId}`);
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
    
    // Mettre à jour le compteur s'il existe
    const countElement = document.getElementById(`${toolName}-vulnerability-count`);
    if (countElement) {
        countElement.textContent = vulnerabilities.length;
    }
    
    // Initialiser les gestionnaires d'événements pour la pagination
    initPaginationHandlers(toolName);
}

/**
 * NOUVELLE FONCTION: Initialise les gestionnaires d'événements pour la pagination
 */
function initPaginationHandlers(toolName) {
    const prevButton = document.getElementById(`${toolName}-prev-page`);
    const nextButton = document.getElementById(`${toolName}-next-page`);
    
    if (prevButton) {
        prevButton.onclick = function() {
            if (paginationState[toolName].currentPage > 1) {
                paginationState[toolName].currentPage--;
                fetchVulnerabilities(toolName);
            }
        };
    }
    
    if (nextButton) {
        nextButton.onclick = function() {
            paginationState[toolName].currentPage++;
            fetchVulnerabilities(toolName);
        };
    }
    
    // Pagination pour les historiques
    const historyPrevButton = document.getElementById(`${toolName}-history-prev-page`);
    const historyNextButton = document.getElementById(`${toolName}-history-next-page`);
    
    if (historyPrevButton) {
        historyPrevButton.onclick = function() {
            if (paginationState[toolName].currentPage > 1) {
                paginationState[toolName].currentPage--;
                fetchScanHistory(toolName);
            }
        };
    }
    
    if (historyNextButton) {
        historyNextButton.onclick = function() {
            paginationState[toolName].currentPage++;
            fetchScanHistory(toolName);
        };
    }
    
    // Ajouter des gestionnaires d'événements pour les filtres
    const severityFilter = document.getElementById(`${toolName}-severity-filter`);
    const statusFilter = document.getElementById(`${toolName}-status-filter`);
    const projectFilter = document.getElementById(`${toolName}-project-filter`);
    
    if (severityFilter) {
        severityFilter.onchange = function() {
            paginationState[toolName].currentPage = 1; // Réinitialiser à la première page lors du filtrage
            fetchVulnerabilities(toolName);
        };
    }
    
    if (statusFilter) {
        statusFilter.onchange = function() {
            paginationState[toolName].currentPage = 1; // Réinitialiser à la première page lors du filtrage
            fetchVulnerabilities(toolName);
        };
    }
    
    if (projectFilter) {
        projectFilter.onchange = function() {
            paginationState[toolName].currentPage = 1; // Réinitialiser à la première page lors du filtrage
            fetchVulnerabilities(toolName);
        };
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
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Date invalide';
        }
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        console.error('Erreur de formatage de date:', e);
        return 'Date invalide';
    }
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
                showNotification('Erreur lors du chargement des détails', 'error');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
            showNotification('Erreur de connexion au serveur', 'error');
        });
}