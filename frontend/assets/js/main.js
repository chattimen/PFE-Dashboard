/**
 * Script principal du dashboard de sécurité
 */

// Configuration globale
const API_BASE_URL = '/api';
let currentPage = 'dashboard';
let darkMode = localStorage.getItem('darkMode') === 'true';
let zapDataLoaded = false;
let allZapVulnerabilities = [];


// Configuration de la pagination
const ITEMS_PER_PAGE = 10;
const paginationState = {
    trivy: {
        vulnerabilities: { currentPage: 1, totalItems: 0, totalPages: 0 },
        history: { currentPage: 1, totalItems: 0, totalPages: 0 }
    },
    sonarqube: {
        vulnerabilities: { currentPage: 1, totalItems: 0, totalPages: 0 },
        history: { currentPage: 1, totalItems: 0, totalPages: 0 }
    },
    zap: {
        vulnerabilities: { currentPage: 1, totalItems: 0, totalPages: 0 },
        history: { currentPage: 1, totalItems: 0, totalPages: 0 }
    },
    selenium: {
        vulnerabilities: { currentPage: 1, totalItems: 0, totalPages: 0 },
        history: { currentPage: 1, totalItems: 0, totalPages: 0 }
    },
    dashboard: {
        latestScans: { currentPage: 1, totalItems: 0, totalPages: 0 }
    }
};

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
        loadVulnerabilityStats(days);
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
 * Gestion de la pagination
 */
function setupPagination(toolName, tableType, totalItems) {
    const state = paginationState[toolName][tableType];
    state.totalItems = totalItems;
    state.totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

    const prevButton = document.getElementById(`${toolName}-${tableType}-prev-page`);
    const nextButton = document.getElementById(`${toolName}-${tableType}-next-page`);
    const pageInfo = document.getElementById(`${toolName}-${tableType}-page-info`);

    if (!prevButton || !nextButton || !pageInfo) {
        console.warn(`Éléments de pagination manquants pour ${toolName}-${tableType}. Vérifiez que les éléments HTML existent.`);
        return false;
    }

    pageInfo.textContent = `Page ${state.currentPage} sur ${state.totalPages}`;
    prevButton.disabled = state.currentPage <= 1;
    nextButton.disabled = state.currentPage >= state.totalPages;

    // Supprimer les anciens écouteurs en clonant les boutons
    const newPrevButton = prevButton.cloneNode(true);
    const newNextButton = nextButton.cloneNode(true);
    prevButton.replaceWith(newPrevButton);
    nextButton.replaceWith(newNextButton);

    newPrevButton.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            console.log(`Affichage page précédente ${state.currentPage} pour ${toolName}-${tableType}`);
            loadTableData(toolName, tableType);
        }
    });

    newNextButton.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            console.log(`Affichage page suivante ${state.currentPage} pour ${toolName}-${tableType}`);
            loadTableData(toolName, tableType);
        }
    });

    return true;
}



/**
 * Chargement des données pour une table spécifique
 */
async function loadTableData(toolName, tableType) {
    const state = paginationState[toolName][tableType];
    console.log(`Chargement des données pour ${toolName}-${tableType}, page: ${state.currentPage}`);
    
    try {
        if (tableType === 'vulnerabilities') {
            if (toolName === 'zap') {
                // Trancher les données ZAP côté client
                const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const paginatedAlerts = allZapVulnerabilities.slice(startIndex, endIndex);
                console.log(`Affichage des vulnérabilités ZAP: ${startIndex} à ${endIndex}, total: ${allZapVulnerabilities.length}`);
                populateVulnerabilityTable(paginatedAlerts);
                // Mettre à jour le compteur total
                const countElement = document.getElementById('zap-vulnerability-count');
                if (countElement) countElement.textContent = allZapVulnerabilities.length;
            } else {
                // Pour les autres outils, conserver la logique API existante
                const offset = (state.currentPage - 1) * ITEMS_PER_PAGE;
                await fetchVulnerabilities(toolName, ITEMS_PER_PAGE, offset);
            }
        } else if (tableType === 'history') {
            const offset = (state.currentPage - 1) * ITEMS_PER_PAGE;
            await fetchScanHistory(toolName, ITEMS_PER_PAGE, offset);
        } else if (tableType === 'latestScans') {
            const offset = (state.currentPage - 1) * ITEMS_PER_PAGE;
            await loadLatestScans(ITEMS_PER_PAGE, offset);
        }

        // Mettre à jour les contrôles de pagination
        const pageInfo = document.getElementById(`${toolName}-${tableType}-page-info`);
        if (pageInfo) pageInfo.textContent = `Page ${state.currentPage} sur ${state.totalPages}`;
        const prevButton = document.getElementById(`${toolName}-${tableType}-prev-page`);
        const nextButton = document.getElementById(`${toolName}-${tableType}-next-page`);
        if (prevButton && nextButton) {
            prevButton.disabled = state.currentPage <= 1;
            nextButton.disabled = state.currentPage >= state.totalPages;
            console.log(`Boutons mis à jour: Précédent=${prevButton.disabled}, Suivant=${nextButton.disabled}`);
        }
    } catch (error) {
        console.error(`Erreur lors du chargement des données pour ${toolName}-${tableType}:`, error);
        showNotification(`Erreur chargement ${toolName}-${tableType}`, 'error');
    }
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
async function initTrivyPage() {
    try {
        // Réinitialiser la pagination
        paginationState.trivy.vulnerabilities.currentPage = 1;
        paginationState.trivy.history.currentPage = 1;
        
        // Charger les vulnérabilités de Trivy
        await fetchVulnerabilities('trivy', ITEMS_PER_PAGE, 0);
        
        // Charger l'historique des scans Trivy
        await fetchScanHistory('trivy', ITEMS_PER_PAGE, 0);
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page Trivy:', error);
        showNotification('Erreur lors du chargement des données Trivy', 'error');
    }
}

/**
 * Initialisation de la page SonarQube
 */
async function initSonarQubePage() {
    try {
        // Réinitialiser la pagination
        paginationState.sonarqube.vulnerabilities.currentPage = 1;
        paginationState.sonarqube.history.currentPage = 1;
        
        // Charger les vulnérabilités de SonarQube
        await fetchVulnerabilities('sonarqube', ITEMS_PER_PAGE, 0);
        
        // Charger l'historique des scans SonarQube
        await fetchScanHistory('sonarqube', ITEMS_PER_PAGE, 0);
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page SonarQube:', error);
        showNotification('Erreur lors du chargement des données SonarQube', 'error');
    }
}

/**
 * Initialisation de la page OWASP ZAP
 */
async function initZapPage() {
    if (zapDataLoaded) return; // Prevent duplicate calls
    try {
        paginationState.zap.vulnerabilities.currentPage = 1;
        paginationState.zap.history.currentPage = 1;
        await loadZapData();
        if (document.querySelector('#zap-history-table tbody')) {
            await fetchScanHistory('zap', ITEMS_PER_PAGE, 0);
        }
    } catch (error) {
        console.error('Erreur ZAP:', error);
        showNotification('Erreur chargement ZAP', 'error');
    }
}

/**
 * Initialisation de la page Selenium
 */
async function initSeleniumPage() {
    try {
        // Réinitialiser la pagination
        paginationState.selenium.vulnerabilities.currentPage = 1;
        paginationState.selenium.history.currentPage = 1;
        
        // Charger les tests Selenium si la table existe
        if (document.querySelector('#selenium-history-table tbody')) {
            await fetchScanHistory('selenium', ITEMS_PER_PAGE, 0);
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page Selenium:', error);
        showNotification('Erreur lors du chargement des données Selenium', 'error');
    }
}

/**
 * Récupération des vulnérabilités par outil
 */
async function fetchVulnerabilities(toolName, limit = ITEMS_PER_PAGE, offset = 0) {
    try {
        let url = `${API_BASE_URL}/vulnerabilities?tool_name=${toolName}&limit=${limit}&offset=${offset}`;
        if (['trivy', 'sonarqube'].includes(toolName)) {
            const latestScanId = await fetchLatestScanId(toolName);
            if (!latestScanId) {
                console.error(`Aucun scan récent pour ${toolName}`);
                showNotification(`Aucun scan récent pour ${toolName}`, 'error');
                return;
            }
            url += `&scan_id=${latestScanId}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        console.log(`${toolName} vulnerabilities API response:`, data);
        if (data.status === 'success') {
            const totalItems = data.total || data.data.length;
            if (setupPagination(toolName, 'vulnerabilities', totalItems)) {
                updateVulnerabilitiesTable(toolName, data.data, totalItems); // Passer totalItems
            }
        } else {
            console.error(`Erreur vulnérabilités ${toolName}:`, data.message);
            showNotification(`Erreur chargement vulnérabilités ${toolName}`, 'error');
        }
    } catch (error) {
        console.error(`Erreur API ${toolName}:`, error);
        showNotification(`Erreur chargement vulnérabilités ${toolName}`, 'error');
    }
}

/**
 * Mise à jour de la table des vulnérabilités
 */
function updateVulnerabilitiesTable(toolName, vulnerabilities, totalCount) {
    const tableId = `${toolName}-vulnerabilities-table`;
    const tableBody = document.querySelector(`#${tableId} tbody`);
    if (!tableBody) {
        console.warn(`Tableau ${tableId} non trouvé`);
        return;
    }
    tableBody.innerHTML = '';
    if (!vulnerabilities || vulnerabilities.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune vulnérabilité trouvée</td></tr>';
        return;
    }
    vulnerabilities.forEach(vuln => {
        const row = document.createElement('tr');
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
    const countElement = document.getElementById(`${toolName}-vulnerability-count`);
    if (countElement) countElement.textContent = totalCount; // Utiliser le compte total
}

/**
 * Formatage de la sévérité pour l'affichage
 */
function formatSeverity(riskdesc) {
    if (!riskdesc) return "Unknown";
    return riskdesc; // riskdesc est déjà formaté comme "High", "Medium", etc.
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
    if (!toolName) return 'Inconnu';
    
    switch (toolName.toLowerCase()) {
        case 'trivy':
            return 'Trivy';
        case 'sonarqube':
            return 'SonarQube';
        case 'zap':
            return 'ZAP';
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
 * Fetches the latest scan ID for a given tool
 */
async function fetchLatestScanId(toolName) {
    try {
        const response = await fetch(`${API_BASE_URL}/scans?tool_name=${toolName}&limit=1`);
        const data = await response.json();
        if (data.status === 'success' && data.data && data.data.length > 0) {
            // Sort scans by scan_date in descending order and take the first one
            const latestScan = data.data.sort((a, b) => new Date(b.scan_date) - new Date(a.scan_date))[0];
            return latestScan.id;
        } else {
            console.warn(`Aucun scan trouvé pour ${toolName}`);
            return null;
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération du dernier scan pour ${toolName}:`, error);
        showNotification(`Erreur lors de la récupération du dernier scan pour ${toolName}`, 'error');
        return null;
    }
}

/**
 * Récupération de l'historique des scans par outil
 */
async function fetchScanHistory(toolName, limit = ITEMS_PER_PAGE, offset = 0) {
    console.log(`Fetching scan history for ${toolName} with limit=${limit}&offset=${offset}`);
    try {
        const response = await fetch(`${API_BASE_URL}/scans?tool_name=${toolName}&limit=${limit}&offset=${offset}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Erreur HTTP! Statut: ${response.status}, Message: ${errorData.message || response.statusText}`);
        }
        const data = await response.json();
        
        console.log(`Scan history response for ${toolName}:`, data);
        if (data.status === 'success') {
            // Supposons que l'API retourne également le nombre total d'éléments
            const totalItems = data.total || data.data.length;
            setupPagination(toolName, 'history', totalItems);
            updateScanHistoryTable(data.data, toolName);
        } else {
            console.error(`Erreur logique API lors du chargement de l'historique des scans ${toolName}:`, data.message);
            showNotification(`L'API a signalé une erreur pour l'historique ${toolName}: ${data.message}`, 'warning');
        }
    } catch (error) {
        console.error('Erreur lors de la requête API ou du traitement de la réponse:', error);
        showNotification(`Erreur lors du chargement de l'historique des scans ${toolName}: ${error.message || error}`, 'error');
    }
}

/**
 * Mise à jour de la table d'historique des scans
 */
function updateScanHistoryTable(scans, toolName) {
    const tableId = `${toolName}-history-table`;
    const tableBody = document.querySelector(`#${tableId} tbody`);
    
    if (!tableBody) {
        console.warn(`Table body non trouvé pour ${tableId}`);
        return;
    }
    
    // Vider la table
    tableBody.innerHTML = '';
    
    // Handle empty state
    if (!scans || scans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Aucun scan trouvé</td></tr>';
        return;
    }
    
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
    if (!status) return 'Inconnu';
    
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
            showNotification('Erreur lors du chargement des statistiques de scans', 'error');
        });
}

/**
 * Mise à jour de l'interface avec les statistiques de scans
 */
function updateScanStatsUI(stats) {
    stats.forEach(stat => {
        const toolName = stat.tool_name?.toLowerCase() || '';
        if (!toolName) return;
        
        // Mettre à jour le nombre total de scans
        const scanCountElement = document.getElementById(`${toolName}-scan-count`);
        if (scanCountElement) {
            scanCountElement.textContent = stat.total_scans;
        }
        
        // Mettre à jour le taux de succès
        const successRateElement = document.getElementById(`${toolName}-success-rate`);
        if (successRateElement && stat.total_scans > 0) {
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
            showNotification('Erreur lors du chargement des tendances', 'error');
        });
}

/**
 * Mise à jour du graphique des tendances de scans
 */
function updateScanTrendsChart(trends) {
    const chartElement = document.getElementById('scan-trends-chart');
    if (!chartElement) {
        console.warn('Élément de graphique scan-trends-chart non trouvé');
        return;
    }
    
    const ctx = chartElement.getContext('2d');
    
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
                    label: 'ZAP',
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
async function loadLatestScans(limit = ITEMS_PER_PAGE, offset = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/scans?limit=${limit}&offset=${offset}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Supposons que l'API retourne également le nombre total d'éléments
            const totalItems = data.total || data.data.length;
            setupPagination('dashboard', 'latestScans', totalItems);
            updateLatestScansTable(data.data);
        } else {
            console.error('Erreur lors du chargement des derniers scans:', data.message);
            showNotification('Erreur lors du chargement des derniers scans', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la requête API:', error);
        showNotification('Erreur lors du chargement des derniers scans', 'error');
    }
}

/**
 * Mise à jour du tableau des derniers scans
 */
function updateLatestScansTable(scans) {
    const tableBody = document.querySelector('#latest-scans-table tbody');
    
    if (!tableBody) {
        console.warn('Table body des derniers scans non trouvé');
        return;
    }
    
    // Vider la table
    tableBody.innerHTML = '';
    
    // Handle empty state
    if (!scans || scans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Aucun scan trouvé</td></tr>';
        return;
    }
    
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
                showNotification('Erreur lors du chargement des détails', 'error');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
            showNotification('Erreur de connexion au serveur', 'error');
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

/**
 * Génère et télécharge un rapport général du dashboard
 */
function downloadDashboardReport() {
    const date = new Date().toLocaleDateString();
    const title = 'Rapport de sécurité global - ' + date;
    
    // Récupérer les statistiques globales
    const vulnsCount = document.getElementById('total-vulns')?.textContent || '0';
    const criticalCount = document.getElementById('critical-vulns')?.textContent || '0';
    const highCount = document.getElementById('high-vulns')?.textContent || '0';
    const mediumCount = document.getElementById('medium-vulns')?.textContent || '0';
    const lowCount = document.getElementById('low-vulns')?.textContent || '0';
    
    // Créer un contenu HTML pour le rapport
    let reportContent = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                .stats { margin: 20px 0; display: flex; flex-wrap: wrap; }
                .stat-card { 
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 10px;
                    width: 200px;
                    text-align: center;
                }
                .stat-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
                .stat-label { color: #666; }
                .section { margin: 30px 0; }
                h2 { color: #444; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .severity-critical { color: #d81b60; font-weight: bold; }
                .severity-high { color: #e53935; font-weight: bold; }
                .severity-medium { color: #fb8c00; }
                .severity-low { color: #4caf50; }
                .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            
            <div class="section">
                <h2>Résumé des vulnérabilités</h2>
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-label">Total</div>
                        <div class="stat-value">${vulnsCount}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Critiques</div>
                        <div class="stat-value severity-critical">${criticalCount}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Élevées</div>
                        <div class="stat-value severity-high">${highCount}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Moyennes</div>
                        <div class="stat-value severity-medium">${mediumCount}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Faibles</div>
                        <div class="stat-value severity-low">${lowCount}</div>
                    </div>
                </div>
            </div>
    `;
    
    // Capturer les graphiques si présents
    const charts = document.querySelectorAll('canvas');
    if (charts.length > 0) {
        reportContent += `<div class="section"><h2>Graphiques</h2>`;
        reportContent += `<p>Les graphiques ne sont pas inclus dans cette version du rapport. Veuillez consulter le dashboard pour les visualisations.</p>`;
        reportContent += `</div>`;
    }
    
    // Ajouter les dernières vulnérabilités si disponibles
    const vulnsTable = document.querySelector('table[id="recent-vulnerabilities-table"]');
    if (vulnsTable) {
        reportContent += `<div class="section"><h2>Dernières vulnérabilités détectées</h2>`;
        
        // Cloner le tableau sans la colonne d'actions
        const clonedTable = vulnsTable.cloneNode(true);
        const actionColumns = clonedTable.querySelectorAll('th:last-child, td:last-child');
        actionColumns.forEach(col => col.remove());
        
        reportContent += clonedTable.outerHTML;
        reportContent += `</div>`;
    }
    
    // Ajouter les derniers scans si disponibles
    const scansTable = document.querySelector('table[id="recent-scans-table"]');
    if (scansTable) {
        reportContent += `<div class="section"><h2>Derniers scans effectués</h2>`;
        
        // Cloner le tableau sans la colonne d'actions
        const clonedTable = scansTable.cloneNode(true);
        const actionColumns = clonedTable.querySelectorAll('th:last-child, td:last-child');
        actionColumns.forEach(col => col.remove());
        
        reportContent += clonedTable.outerHTML;
        reportContent += `</div>`;
    }
    
    reportContent += `
            <div class="footer">
                <p>Rapport généré le ${new Date().toLocaleString()} via le Dashboard de Sécurité</p>
            </div>
        </body>
        </html>
    `;
    
    // Créer un Blob avec le contenu HTML
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement et le cliquer
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-dashboard-report-${date.replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Ajouter un gestionnaire d'événement pour le bouton de téléchargement
document.addEventListener('DOMContentLoaded', function() {
    const downloadButton = document.getElementById('download-report');
    if (downloadButton) {
        downloadButton.addEventListener('click', function() {
            downloadDashboardReport();
        });
    }
});

// ZAP Page Functions
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('zap-page')) {
        loadZapData();
    }
});

function transformApiDataToZapFormat(vulnerabilities) {
    const zapData = {
        "@programName": "ZAP",
        "@version": "2.16.0",
        "@generated": new Date().toISOString(),
        "site": [
            {
                "@name": vulnerabilities[0]?.location || "http://unknown",
                "@host": vulnerabilities[0]?.location?.split('/')[2]?.split(':')[0] || "unknown",
                "@port": vulnerabilities[0]?.location?.split(':')[3] || "80",
                "@ssl": vulnerabilities[0]?.location?.startsWith('https') ? "true" : "false",
                "alerts": vulnerabilities.map(vuln => {
                    const severity = vuln.severity?.toLowerCase() || "medium";
                    const riskCode = mapSeverityToRiskCode(severity);
                    return {
                        "pluginid": vuln.id || "N/A",
                        "alertRef": vuln.id || "N/A",
                        "alert": vuln.title || "Unknown Vulnerability",
                        "name": vuln.title || "Unknown Vulnerability",
                        "riskcode": riskCode,
                        "confidence": "2",
                        "riskdesc": severity.charAt(0).toUpperCase() + severity.slice(1), // Ex: "High"
                        "desc": vuln.description || "No description available",
                        "instances": [{ uri: vuln.location || "N/A", method: "GET", param: "", attack: "", evidence: "" }],
                        "count": "1",
                        "solution": vuln.remediation || "No solution provided",
                        "otherinfo": "",
                        "reference": "",
                        "cweid": vuln.cwe || "-1",
                        "wascid": "-1",
                        "sourceid": "",
                        "category": vuln.category || "N/A",
                        "status": vuln.status || "open",
                        "location": vuln.location || "N/A"
                    };
                })
            }
        ]
    };
    return zapData;
}


function mapSeverityToRiskCode(severity) {
    const severityMap = {
        "critical": "4",
        "high": "3",
        "medium": "2",
        "low": "1",
        "info": "0"
    };
    return severityMap[severity.toLowerCase()] || "2"; // Par défaut: Medium
}

async function loadZapData() {
    if (zapDataLoaded) return;
    zapDataLoaded = true;
    try {
        const latestScanId = await fetchLatestScanId('zap');
        if (!latestScanId) {
            console.error('Aucun scan récent ZAP');
            showNotification('Aucun scan récent ZAP', 'error');
            zapDataLoaded = false;
            return;
        }
        // Récupérer toutes les vulnérabilités sans limit/offset
        const response = await fetch(`${API_BASE_URL}/vulnerabilities?tool_name=zap&scan_id=${latestScanId}`);
        const data = await response.json();
        console.log('ZAP vulnerabilities API response:', data);
        if (data.status === 'success') {
            const totalItems = data.total || data.data.length;
            allZapVulnerabilities = transformApiDataToZapFormat(data.data).site[0].alerts; // Stocker toutes les alertes
            if (setupPagination('zap', 'vulnerabilities', totalItems)) {
                // Afficher la première page (10 premières vulnérabilités)
                const paginatedAlerts = allZapVulnerabilities.slice(0, ITEMS_PER_PAGE);
                processZapData({ site: [{ alerts: paginatedAlerts }] }, totalItems);
            }
        } else {
            console.error('Erreur ZAP:', data.message);
            showNotification('Erreur chargement ZAP', 'error');
            zapDataLoaded = false;
        }
    } catch (error) {
        console.error('Erreur ZAP:', error);
        showNotification('Erreur chargement ZAP', 'error');
        zapDataLoaded = false;
    }
}

function processZapData(data, totalItems) {
    if (!data || !data.site || !data.site[0]) {
        console.error("Format données ZAP invalide");
        return;
    }
    const site = data.site[0];
    const alerts = site.alerts || [];
    if (alerts.length === 0) console.warn("Aucune alerte ZAP");
    try {
        updateScanInfo(data, site);
        updateVulnerabilityCounts(alerts);
        renderVulnerabilityCharts(alerts);
        populateVulnerabilityTable(alerts);
        initializeEventHandlers(alerts);
        const countElement = document.getElementById('zap-vulnerability-count');
        if (countElement) countElement.textContent = totalItems; // Mettre à jour avec le compte total
    } catch (error) {
        console.error('Erreur traitement ZAP:', error);
        showNotification('Erreur traitement ZAP', 'error');
    }
}

function updateScanInfo(data, site) {
    const pageTitle = document.querySelector('#zap-page .page-title');
    if (!pageTitle) {
        console.warn("Élément .page-title non trouvé dans #zap-page");
        return;
    }
    
    pageTitle.innerHTML = `ZAP - Scanner de vulnérabilités Web <small>(v${data["@version"]})</small>`;
    
    const existingScanInfo = document.querySelector('#zap-page .scan-info');
    if (existingScanInfo) {
        existingScanInfo.remove();
    }
    
    const scanInfoEl = document.createElement('div');
    scanInfoEl.className = 'scan-info';
    scanInfoEl.innerHTML = `
        <p><strong>Site scanné:</strong> ${site["@name"]}</p>
        <p><strong>Date du scan:</strong> ${data["@generated"]}</p>
    `;
    
    const pageHeader = document.querySelector('#zap-page .page-header');
    if (pageHeader) {
        pageHeader.parentNode.insertBefore(scanInfoEl, pageHeader.nextSibling);
    } else {
        const zapPage = document.getElementById('zap-page');
        if (zapPage) {
            zapPage.appendChild(scanInfoEl);
        }
    }
}

function updateVulnerabilityCounts(alerts) {
    const severityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
    };
    
    alerts.forEach(alert => {
        const riskCode = parseInt(alert.riskcode);
        
        if (riskCode === 3) severityCounts.critical++;
        else if (riskCode === 2) severityCounts.high++;
        else if (riskCode === 1) severityCounts.medium++;
        else if (riskCode === 0) severityCounts.low++;
    });
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('zap-critical-count', severityCounts.critical);
    updateElement('zap-high-count', severityCounts.high);
    updateElement('zap-medium-count', severityCounts.medium);
    updateElement('zap-low-count', severityCounts.low + severityCounts.info);
}

let zapSeverityChart = null;
let zapCategoryChart = null;

function renderVulnerabilityCharts(alerts) {
    const severityChart = document.getElementById('zap-severity-chart');
    const categoryChart = document.getElementById('zap-category-chart');
    
    if (zapSeverityChart) {
        zapSeverityChart.destroy();
    }
    
    if (zapCategoryChart) {
        zapCategoryChart.destroy();
    }
    
    if (!severityChart || !categoryChart) {
        console.warn("Un ou plusieurs éléments canvas de graphique ZAP non trouvés");
        return;
    }
    
    const severityCounts = [0, 0, 0, 0];
    const categoryCounts = {};
    
    alerts.forEach(alert => {
        const riskCode = parseInt(alert.riskcode);
    
        if (riskCode === 3) severityCounts[0]++;
        else if (riskCode === 2) severityCounts[1]++;
        else if (riskCode === 1) severityCounts[2]++;
        else if (riskCode === 0) severityCounts[3]++;
    
        if (alert.wascid && alert.wascid !== "-1") {
            const category = `WASC-${alert.wascid}`;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
    });
    
    try {
        const severityCtx = severityChart.getContext('2d');
        zapSeverityChart = new Chart(severityCtx, {
            type: 'pie',
            data: {
                labels: ['Critique', 'Élevée', 'Moyenne', 'Faible/Info'],
                datasets: [{
                    data: severityCounts,
                    backgroundColor: ['#ff4d4d', '#ffaa00', '#ffcc00', '#5bc0de']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    
        const categoryLabels = Object.keys(categoryCounts);
        const categoryData = categoryLabels.map(cat => categoryCounts[cat]);
    
        const categoryCtx = categoryChart.getContext('2d');
        zapCategoryChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categoryLabels,
                datasets: [{
                    label: 'Nombre de vulnérabilités',
                    data: categoryData,
                    backgroundColor: '#4e73df'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    
    } catch (e) {
        console.error("Erreur lors de la création des graphiques ZAP:", e);
    }
}

function populateVulnerabilityTable(alerts) {
    const tableBody = document.querySelector('#zap-vulnerabilities-table tbody');
    if (!tableBody) {
        console.warn('Corps de la table #zap-vulnerabilities-table non trouvé');
        return;
    }
    tableBody.innerHTML = '';
    if (!alerts || alerts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune vulnérabilité trouvée</td></tr>';
        return;
    }
    alerts.forEach((alert, index) => {
        const row = document.createElement('tr');
        const severityLevel = alert.riskdesc?.toLowerCase() || "medium";
        row.classList.add(`severity-${severityLevel}`);
        row.innerHTML = `
            <td>${alert.alert || 'N/A'}</td>
            <td><span class="badge severity-${severityLevel}">${alert.riskdesc || 'Medium'}</span></td>
            <td>${alert.instances[0]?.uri || 'N/A'}</td>
            <td>${alert.category || 'N/A'}</td>
            <td>${alert.status || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-info" data-alert-index="${index}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    initializeEventHandlers(alerts); // Réinitialiser les gestionnaires après mise à jour
}

function initializeEventHandlers(alerts) {
    const detailButtons = document.querySelectorAll('#zap-vulnerabilities-table-body .btn-info');
    detailButtons.forEach(button => {
        button.removeEventListener('click', handleDetailClick); // Éviter les doublons
        button.addEventListener('click', handleDetailClick);
    });

    function handleDetailClick(event) {
        event.preventDefault(); // Empêcher le comportement par défaut si applicable
        const alertIndex = this.getAttribute('data-alert-index');
        if (alertIndex !== null && alerts[alertIndex]) {
            console.log(`Affichage des détails pour l'alerte ${alertIndex}:`, alerts[alertIndex]);
            showAlertDetails(alerts[alertIndex]);
        } else {
            console.warn('Indice d\'alerte invalide ou alerte non trouvée');
        }
    }

    const modalCloseBtn = document.querySelector('#zap-alert-modal .close-modal');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            const modal = document.getElementById('zap-alert-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    const exportBtn = document.getElementById('export-zap-csv');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportToCSV(alerts));
    }
}

/**
 * Script principal du dashboard de sécurité (suite)
 */

/**
 * Affichage des détails d'une alerte ZAP dans une modal
 */
function showAlertDetails(alert) {
    const modal = document.getElementById('zap-alert-modal');
    if (!modal) {
        console.warn("Modal #zap-alert-modal non trouvé");
        return;
    }

    // Contenu de la modal
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${alert.name}</h2>
                <span class="close-modal">×</span>
            </div>
            <div class="modal-body">
                <div class="alert-details">
                    <p><strong>ID:</strong> ${alert.pluginid || 'N/A'}</p>
                    <p><strong>Sévérité:</strong> <span class="badge severity-${
                        alert.riskcode === "3" ? "critical" : 
                        alert.riskcode === "2" ? "high" : 
                        alert.riskcode === "1" ? "medium" : "low"
                    }">${formatSeverity(
                        alert.riskcode === "3" ? "critical" : 
                        alert.riskcode === "2" ? "high" : 
                        alert.riskcode === "1" ? "medium" : "low"
                    )}</span></p>
                    <p><strong>Statut:</strong> <span class="badge status-${alert.status}">${formatStatus(alert.status)}</span></p>
                    <p><strong>Emplacement:</strong> ${alert.location || 'N/A'}</p>
                    <p><strong>Catégorie:</strong> ${alert.category || 'N/A'}</p>
                    <p><strong>CWE ID:</strong> ${alert.cweid || 'N/A'}</p>
                    <p><strong>WASC ID:</strong> ${alert.wascid || 'N/A'}</p>
                    
                    <h3>Description</h3>
                    <div class="description-box">
                        ${alert.desc || 'Aucune description disponible'}
                    </div>
                    
                    <h3>Solution</h3>
                    <div class="remediation-box">
                        ${alert.solution || 'Aucune solution disponible'}
                    </div>
                    
                    <h3>Instances</h3>
                    <div class="instances-box">
                        ${
                            alert.instances && alert.instances.length > 0
                                ? alert.instances.map(instance => `
                                    <p><strong>URI:</strong> ${instance.uri || 'N/A'}</p>
                                    <p><strong>Méthode:</strong> ${instance.method || 'N/A'}</p>
                                    <p><strong>Paramètre:</strong> ${instance.param || 'N/A'}</p>
                                    <p><strong>Attaque:</strong> ${instance.attack || 'N/A'}</p>
                                    <p><strong>Preuve:</strong> ${instance.evidence || 'N/A'}</p>
                                    <hr>
                                `).join('')
                                : 'Aucune instance disponible'
                        }
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="updateVulnerabilityStatus(${alert.pluginid}, 'fixed')">Marquer comme corrigé</button>
                    <button class="btn btn-warning" onclick="updateVulnerabilityStatus(${alert.pluginid}, 'false_positive')">Faux positif</button>
                    <button class="btn btn-secondary" onclick="updateVulnerabilityStatus(${alert.pluginid}, 'accepted_risk')">Risque accepté</button>
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
 * Filtrage de la table des vulnérabilités ZAP
 */
function filterVulnerabilityTable(alerts) {
    const severityFilter = document.getElementById('zap-severity-filter');
    const statusFilter = document.getElementById('zap-status-filter');
    
    if (!severityFilter || !statusFilter) {
        console.warn("Filtres de sévérité ou de statut non trouvés");
        return;
    }

    const selectedSeverity = severityFilter.value;
    const selectedStatus = statusFilter.value;

    const filteredAlerts = alerts.filter(alert => {
        const severityMatch = selectedSeverity === 'all' || (
            (selectedSeverity === 'critical' && alert.riskcode === '3') ||
            (selectedSeverity === 'high' && alert.riskcode === '2') ||
            (selectedSeverity === 'medium' && alert.riskcode === '1') ||
            (selectedSeverity === 'low' && alert.riskcode === '0')
        );
        const statusMatch = selectedStatus === 'all' || alert.status === selectedStatus;
        return severityMatch && statusMatch;
    });

    populateVulnerabilityTable(filteredAlerts);
}

/**
 * Exportation des données ZAP au format CSV
 */
function exportToCSV(alerts) {
    if (!alerts || alerts.length === 0) {
        showNotification('Aucune donnée à exporter', 'warning');
        return;
    }

    const headers = ['ID', 'Nom', 'Sévérité', 'Emplacement', 'Catégorie', 'Statut', 'Description', 'Solution', 'CWE ID', 'WASC ID'];
    const rows = alerts.map(alert => [
        alert.pluginid || 'N/A',
        `"${alert.name.replace(/"/g, '""')}"`,
        formatSeverity(
            alert.riskcode === '3' ? 'critical' : 
            alert.riskcode === '2' ? 'high' : 
            alert.riskcode === '1' ? 'medium' : 'low'
        ),
        `"${alert.location || 'N/A'}"`,
        `"${alert.category || 'N/A'}"`,
        formatStatus(alert.status),
        `"${alert.desc ? alert.desc.replace(/"/g, '""') : 'N/A'}"`,
        `"${alert.solution ? alert.solution.replace(/"/g, '""') : 'N/A'}"`,
        alert.cweid || 'N/A',
        alert.wascid || 'N/A'
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zap-vulnerabilities-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Données exportées avec succès', 'success');
}

/**
 * Initialisation de la page des paramètres
 */
function initSettingsPage() {
    // Charger les paramètres actuels
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    if (themeToggle) {
        themeToggle.checked = darkMode;
        themeToggle.addEventListener('change', function() {
            darkMode = this.checked;
            localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
            updateTheme();
        });
    }

    // Gestion des paramètres de notification
    const notificationSettings = document.getElementById('notification-settings');
    if (notificationSettings) {
        notificationSettings.addEventListener('change', function() {
            // Enregistrer les préférences de notification
            localStorage.setItem('notificationSettings', this.value);
            showNotification('Paramètres de notification mis à jour', 'success');
        });
    }
}

/**
 * Gestion des erreurs globales
 */
window.onerror = function(message, source, lineno, colno, error) {
    console.error(`Erreur globale: ${message} à ${source}:${lineno}:${colno}`, error);
    showNotification('Une erreur inattendue s\'est produite. Veuillez consulter la console pour plus de détails.', 'error');
};

/**
 * Gestion des erreurs de promesse non gérées
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promesse non gérée rejetée:', event.reason);
    showNotification('Une erreur serveur s\'est produite. Veuillez vérifier votre connexion.', 'error');
});

// Ajouter un gestionnaire pour le chargement différé des pages
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si la page initiale doit être chargée
    const activeNav = document.querySelector('nav a.active');
    if (activeNav) {
        const initialPage = activeNav.getAttribute('data-page');
        if (initialPage && initialPage !== currentPage) {
            currentPage = initialPage;
            const pageElement = document.getElementById(`${initialPage}-page`);
            if (pageElement) {
                pageElement.style.display = 'block';
                if (initialPage === 'dashboard') initDashboard();
                else if (initialPage === 'trivy') initTrivyPage();
                else if (initialPage === 'sonarqube') initSonarQubePage();
                else if (initialPage === 'zap') initZapPage();
                else if (initialPage === 'selenium') initSeleniumPage();
                else if (initialPage === 'settings') initSettingsPage();
            }
        }
    }
});