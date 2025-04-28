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
 * Initialisation de la page OWASP ZAP avec débogage amélioré
 */
function initZapPage() {
    console.log("Début de l'initialisation de la page ZAP");
    
    // Forcer le rechargement des données ZAP
    zapDataLoaded = false;
    
    // Afficher un message de débogage dans la page pour indiquer le chargement
    const zapPage = document.getElementById('zap-page');
    if (zapPage) {
        const debugMsg = document.createElement('div');
        debugMsg.className = 'debug-message';
        debugMsg.style.padding = '10px';
        debugMsg.style.margin = '10px 0';
        debugMsg.style.border = '1px solid #ccc';
        debugMsg.style.backgroundColor = '#f8f9fa';
        debugMsg.innerHTML = '<h4>Chargement des données ZAP...</h4>';
        
        // Insérer le message au début de la page
        if (zapPage.firstChild) {
            zapPage.insertBefore(debugMsg, zapPage.firstChild);
        } else {
            zapPage.appendChild(debugMsg);
        }
        
        // Référence pour mettre à jour plus tard
        window.debugElement = debugMsg;
    }
    
    // Vérifier l'existence des tables
    const vulnTableExists = document.querySelector('#zap-vulnerabilities-table-body') !== null;
    const historyTableExists = document.querySelector('#zap-history-table-body') !== null;
    
    console.log("Tables ZAP trouvées:", {
        vulnerabilityTable: vulnTableExists,
        historyTable: historyTableExists
    });
    
    if (window.debugElement) {
        window.debugElement.innerHTML += `
            <p>Tables trouvées:
                <ul>
                    <li>Vulnérabilités: ${vulnTableExists ? 'Oui' : 'Non'}</li>
                    <li>Historique: ${historyTableExists ? 'Oui' : 'Non'}</li>
                </ul>
            </p>
        `;
    }
    
    // Force la création des tableaux s'ils n'existent pas
    if (!vulnTableExists) {
        const vulnTable = document.querySelector('#zap-vulnerabilities-table');
        if (vulnTable && !document.querySelector('#zap-vulnerabilities-table-body')) {
            console.log("Création du tbody manquant pour le tableau des vulnérabilités");
            const tbody = document.createElement('tbody');
            tbody.id = 'zap-vulnerabilities-table-body';
            vulnTable.appendChild(tbody);
        }
    }
    
    if (!historyTableExists) {
        const historyTable = document.querySelector('#zap-history-table');
        if (historyTable && !document.querySelector('#zap-history-table-body')) {
            console.log("Création du tbody manquant pour le tableau d'historique");
            const tbody = document.createElement('tbody');
            tbody.id = 'zap-history-table-body';
            historyTable.appendChild(tbody);
        }
    }
    
    // Charger les vulnérabilités de ZAP
    try {
        console.log("Chargement des vulnérabilités ZAP");
        fetchVulnerabilities('zap');
        if (window.debugElement) {
            window.debugElement.innerHTML += '<p>✓ Appel à fetchVulnerabilities(\'zap\')</p>';
        }
    } catch (error) {
        console.error("Erreur lors du chargement des vulnérabilités:", error);
        if (window.debugElement) {
            window.debugElement.innerHTML += `<p>⚠️ Erreur: ${error.message}</p>`;
        }
    }
    
    // Charger l'historique des scans ZAP
    try {
        console.log("Chargement de l'historique des scans ZAP");
        fetchScanHistory('zap');
        if (window.debugElement) {
            window.debugElement.innerHTML += '<p>✓ Appel à fetchScanHistory(\'zap\')</p>';
        }
    } catch (error) {
        console.error("Erreur lors du chargement de l'historique:", error);
        if (window.debugElement) {
            window.debugElement.innerHTML += `<p>⚠️ Erreur: ${error.message}</p>`;
        }
    }
    
    // Initialiser la partie spécifique à ZAP
    try {
        if (typeof loadZapData === 'function') {
            console.log("Chargement des données spécifiques ZAP");
            loadZapData();
            if (window.debugElement) {
                window.debugElement.innerHTML += '<p>✓ Appel à loadZapData()</p>';
            }
        } else {
            console.warn("Fonction loadZapData non disponible");
            if (window.debugElement) {
                window.debugElement.innerHTML += '<p>⚠️ Fonction loadZapData non disponible</p>';
            }
            
            // Utiliser les données de démonstration
            populateDemoData();
        }
    } catch (error) {
        console.error("Erreur lors du chargement des données ZAP:", error);
        if (window.debugElement) {
            window.debugElement.innerHTML += `<p>⚠️ Erreur: ${error.message}</p>`;
            window.debugElement.innerHTML += '<p>Tentative de chargement des données de démonstration...</p>';
        }
        
        // En cas d'erreur, utiliser les données de démonstration
        try {
            populateDemoData();
            if (window.debugElement) {
                window.debugElement.innerHTML += '<p>✓ Données de démonstration chargées</p>';
            }
        } catch (demoError) {
            console.error("Erreur lors du chargement des données de démonstration:", demoError);
            if (window.debugElement) {
                window.debugElement.innerHTML += `<p>⚠️ Erreur: ${demoError.message}</p>`;
            }
        }
    }
    
    console.log("Fin de l'initialisation de la page ZAP");
    
    // Ajouter un bouton pour recharger les données (pour déboguer)
    if (window.debugElement) {
        window.debugElement.innerHTML += `
            <button onclick="initZapPage()" class="btn btn-sm btn-primary">
                Recharger la page ZAP
            </button>
            <button onclick="populateDemoData()" class="btn btn-sm btn-secondary">
                Charger les données de démonstration
            </button>
        `;
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

/**
 * Récupération des vulnérabilités par outil
 */
function fetchVulnerabilities(toolName, limit = 50, offset = 0) {
    // Pour la compatibilité avec le backend, convertir 'zap' en 'owasp_zap' pour l'API
    const apiToolName = toolName === 'zap' ? 'owasp_zap' : toolName;
    
    fetch(`${API_BASE_URL}/vulnerabilities?tool_name=${apiToolName}&limit=${limit}&offset=${offset}`)
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
            showNotification(`Erreur lors du chargement des vulnérabilités ${toolName}`, 'error');
        });
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
    // Pour la compatibilité avec le backend, convertir 'zap' en 'owasp_zap' pour l'API
    const apiToolName = toolName === 'zap' ? 'owasp_zap' : toolName;
    
    // Assurez-vous que API_BASE_URL est correctement défini
    fetch(`${API_BASE_URL}/scans?tool_name=${apiToolName}&limit=${limit}`)
        .then(response => {
            // Vérifier si la réponse HTTP est OK (statut 200-299)
            if (!response.ok) {
                // Si non OK, rejeter la promesse pour passer au .catch
                 return response.json().then(errorData => {
                     throw new Error(`Erreur HTTP! Statut: ${response.status}, Message: ${errorData.message || response.statusText}`);
                 }).catch(() => {
                     // Gérer le cas où la réponse n'est pas OK et le corps n'est pas un JSON valide
                     throw new Error(`Erreur HTTP! Statut: ${response.status}, Message: ${response.statusText}`);
                 });
            }
            // Si OK, traiter la réponse JSON
            return response.json();
        })
        .then(data => {
            // Ce bloc s'exécute si fetch et response.json() réussissent
            if (data.status === 'success') {
                // Appeler la fonction pour mettre à jour le tableau avec les données reçues
                updateScanHistoryTable(data.data, toolName);
            } else {
                // Si l'API renvoie un statut 'error' dans le corps de la réponse
                console.error(`Erreur logique API lors du chargement de l'historique des scans ${toolName}:`, data.message);
                // Optionnel : Afficher une notification même pour une erreur logique de l'API
                 showNotification(`L\'API a signalé une erreur pour l\'historique ${toolName}: ${data.message}`, 'warning'); // Utilisez 'warning' ou 'error'
            }
        })
        .catch(error => {
            // Ce bloc s'exécute si une erreur réseau survient ou si response.ok était false
            console.error('Erreur lors de la requête API ou du traitement de la réponse:', error);
            // Afficher une notification à l'utilisateur
            showNotification(`Erreur lors du chargement de l'historique des scans ${toolName}: ${error.message || error}`, 'error'); // Correction de la parenthèse en trop et affichage du message d'erreur
        });
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
        // Mettre à jour les compteurs dans l'interface pour chaque outil
        stats.forEach(stat => {
            const toolName = stat.tool_name?.toLowerCase() || '';
            if (!toolName) return;
            
            // Convertir owasp_zap en zap pour la sélection des éléments DOM
            const domToolName = toolName === 'owasp_zap' ? 'zap' : toolName;
            
            // Mettre à jour le nombre total de scans
            const scanCountElement = document.getElementById(`${domToolName}-scan-count`);
            if (scanCountElement) {
                scanCountElement.textContent = stat.total_scans;
            }
            
            // Mettre à jour le taux de succès
            const successRateElement = document.getElementById(`${domToolName}-success-rate`);
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
                showNotification('Erreur lors du chargement des derniers scans', 'error');
            });
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
    
    let zapDataLoaded = false;
    
    function loadZapData() {
        
        try {
            // Dans un environnement réel, ces données seraient récupérées via AJAX
            // Pour l'exemple, nous utilisons des données de démonstration
            const zapData = {
                "@programName": "ZAP",
                "@version": "2.16.0",
                "@generated": "Wed, 23 Apr 2025 14:45:54",
                "site": [ 
                    {
                        "@name": "http://192.168.231.128:8080",
                        "@host": "192.168.231.128",
                        "@port": "8080",
                        "@ssl": "false",
                        "alerts": [
                            {
                                "pluginid": "10016",
                                "alertRef": "10016",
                                "alert": "Web Browser XSS Protection Not Enabled",
                                "name": "Web Browser XSS Protection Not Enabled",
                                "riskcode": "1",
                                "confidence": "2",
                                "riskdesc": "Low (Medium)",
                                "desc": "Web Browser XSS Protection is not enabled, or is disabled by the configuration of the 'X-XSS-Protection' HTTP response header on the web server",
                                "instances": [
                                    {
                                       "uri": "http://192.168.231.128:8080/login",
                                        "method": "GET",
                                        "param": "",
                                        "attack": "",
                                        "evidence": ""
                                    }
                                ],
                                "count": "1",
                                "solution": "Ensure that the web browser's XSS filter is enabled, by setting the X-XSS-Protection HTTP response header to '1'.",
                                "otherinfo": "The X-XSS-Protection HTTP response header allows the web server to enable or disable the web browser's XSS protection mechanism.",
                                "reference": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection",
                                "cweid": "933",
                                "wascid": "14",
                                "sourceid": ""
                            },
                            {
                                "pluginid": "10021",
                                "alertRef": "10021",
                                "alert": "X-Content-Type-Options Header Missing",
                                "name": "X-Content-Type-Options Header Missing",
                                "riskcode": "1",
                                "confidence": "2",
                                "riskdesc": "Low (Medium)",
                                "desc": "The Anti-MIME-Sniffing header X-Content-Type-Options was not set to 'nosniff'.",
                                "instances": [
                                    {
                                        "uri": "http://192.168.231.128:8080/assets/js/main.js",
                                        "method": "GET",
                                        "param": "",
                                        "attack": "",
                                        "evidence": ""
                                    }
                                ],
                                "count": "3",
                                "solution": "Ensure that the application/web server sets the Content-Type header appropriately, and that it sets the X-Content-Type-Options header to 'nosniff' for all web pages.",
                                "reference": "https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/06-Test_for_Content_Security_Policy",
                                "cweid": "693",
                                "wascid": "15",
                                "sourceid": ""
                            },
                            {
                                "pluginid": "10096",
                                "alertRef": "10096",
                                "alert": "Timestamp Disclosure",
                                "name": "Timestamp Disclosure",
                                "riskcode": "0",
                                "confidence": "1",
                                "riskdesc": "Informational (Low)",
                                "desc": "A timestamp was disclosed by the application/web server.",
                                "instances": [
                                    {
                                        "uri": "http://192.168.231.128:8080/assets/js/main.js",
                                        "method": "GET",
                                        "param": "",
                                        "attack": "",
                                        "evidence": "20200"
                                    }
                                ],
                                "count": "15",
                                "solution": "Manually confirm that the timestamp data is not sensitive, and that the data cannot be aggregated to disclose exploitable patterns.",
                                "otherinfo": "20200, which appears to be a timestamp, was found in the response body.",
                                "reference": "https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/01-Information_Gathering/05-Review_Webpage_Content_for_Information_Leakage",
                                "cweid": "200",
                                "wascid": "13",
                                "sourceid": ""
                            }
                        ]
                    }
                ]
            };
    
            // Récupérer le JSON depuis une balise script si disponible, sinon utiliser les données de démonstration
            const jsonElement = document.getElementById('zap-data');
            if (jsonElement && jsonElement.textContent) {
                const parsedData = JSON.parse(jsonElement.textContent);
                processZapData(parsedData);
            } else {
                // Utiliser les données de démonstration
                processZapData(zapData);
            }
            zapDataLoaded = true;
        } catch (e) {
            console.error("Erreur lors du traitement des données ZAP:", e);
            showNotification("Erreur lors du chargement des données ZAP", "error");
            zapDataLoaded = false; // Réinitialiser le drapeau en cas d'erreur
        }
    }
    
    function processZapData(data) {
        if (!data || !data.site || !data.site[0]) {
            console.error("Format de données ZAP invalide");
            return;
        }
    
        const site = data.site[0];
        const alerts = site.alerts || [];
        
        if (alerts.length === 0) {
            console.warn("Aucune alerte ZAP trouvée");
        }
        
        try {
            updateScanInfo(data, site);
            updateVulnerabilityCounts(alerts);
            renderVulnerabilityCharts(alerts);
            populateVulnerabilityTable(alerts);
            
            // Initialiser les gestionnaires d'événements
            initializeEventHandlers(alerts);
        } catch (e) {
            console.error("Erreur lors du traitement des données ZAP:", e);
            showNotification("Erreur lors du traitement des données ZAP", "error");
        }
    }
    
    function updateScanInfo(data, site) {
        // Vérifier si les éléments nécessaires existent
        const pageTitle = document.querySelector('#zap-page .page-title');
        if (!pageTitle) {
            console.warn("Élément .page-title non trouvé dans #zap-page");
            return;
        }
        
        // Mise à jour des informations générales du scan
        pageTitle.innerHTML = `OWASP ZAP - Scanner de vulnérabilités Web <small>(v${data["@version"]})</small>`;
        
        // Ajouter des détails supplémentaires 
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
        
        // Insérer après le header de la page
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
        // Comptage des vulnérabilités par niveau de sévérité
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
        
        // Mise à jour des compteurs s'ils existent
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
        // Vérifier si les éléments canvas existent
        const severityChart = document.getElementById('zap-severity-chart');
        const categoryChart = document.getElementById('zap-category-chart');
    
        // Détruire les anciens graphiques s'ils existent
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
    
        // Préparer les données pour les graphiques
        const severityCounts = [0, 0, 0, 0]; // Critical, High, Medium, Low/Info
        const categoryCounts = {};
    
        alerts.forEach(alert => {
            const riskCode = parseInt(alert.riskcode);
    
            if (riskCode === 3) severityCounts[0]++;
            else if (riskCode === 2) severityCounts[1]++;
            else if (riskCode === 1) severityCounts[2]++;
            else if (riskCode === 0) severityCounts[3]++;
    
            // Compter par catégorie (WASC)
            if (alert.wascid && alert.wascid !== "-1") {
                const category = `WASC-${alert.wascid}`;
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
        });
    
        try {
            // === Graphique de distribution par sévérité ===
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
    
            // === Graphique de distribution par catégorie ===
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
        const tableBody = document.getElementById('zap-vulnerabilities-table-body');
        if (!tableBody) {
            console.warn("Élément #zap-vulnerabilities-table-body non trouvé");
            return;
        }
        
        // Vider la table
        tableBody.innerHTML = '';
        
        // Remplir avec les nouvelles données
        alerts.forEach((alert, index) => {
            const row = document.createElement('tr');
            
            // Déterminer la classe CSS basée sur la sévérité
            let severityClass = '';
            let severityText = '';
            
            switch(alert.riskcode) {
                case "3":
                    severityClass = 'critical';
                    severityText = 'Critique';
                    break;
                case "2":
                    severityClass = 'medium';
                    severityText = 'Moyenne';
                    break;
                case "1":
                    severityClass = 'low';
                    severityText = 'Faible';
                    break;
                case "0":
                    severityClass = 'info';
                    severityText = 'Info';
                    break;
            }
            
            row.innerHTML = `
                <td>${alert.name}</td>
                <td><span class="badge badge-${severityClass}">${severityText}</span></td>
                <td>${alert.confidence === "3" ? "Haute" : alert.confidence === "2" ? "Moyenne" : "Faible"}</td>
                <td>${alert.count}</td>
                <td>${alert.cweid !== "-1" ? alert.cweid : "N/A"}</td>
                <td>
                    <button class="btn btn-sm btn-primary view-details" data-alert-index="${index}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    function initializeEventHandlers(alerts) {
        // Gestion des boutons de détails
        const detailButtons = document.querySelectorAll('.view-details');
        if (detailButtons.length > 0) {
            detailButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const alertIndex = this.getAttribute('data-alert-index');
                    if (alertIndex !== null && alerts[alertIndex]) {
                        showAlertDetails(alerts[alertIndex]);
                    }
                });
            });
        }
        
        // Gestion du filtre de sévérité
        const severityFilter = document.getElementById('zap-severity-filter');
        if (severityFilter) {
            severityFilter.addEventListener('change', function() {
                filterVulnerabilityTable(alerts);
            });
        }
        
        // Gestion du filtre de statut
        const statusFilter = document.getElementById('zap-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                filterVulnerabilityTable(alerts);
            });
        }
        
        // Fermeture de la modal si elle existe
        const modalCloseBtn = document.querySelector('#zap-alert-modal .close-modal');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', function() {
                const modal = document.getElementById('zap-alert-modal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        // Export CSV
        const exportBtn = document.getElementById('export-zap-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                exportToCSV(alerts);
            });
        }
    }
    
    function showAlertDetails(alert) {
        const modal = document.getElementById('zap-alert-modal');
        if (!modal) {
            console.warn("Modal #zap-alert-modal non trouvée");
            return;
        }
        
        const modalBody = document.getElementById('zap-alert-details');
        if (!modalBody) {
            console.warn("Élément #zap-alert-details non trouvé");
            return;
        }
        
        // Formater les instances pour l'affichage
        let instancesHtml = '';
        if (alert.instances && alert.instances.length > 0) {
            instancesHtml = '<h3>Instances</h3><ul>';
            alert.instances.forEach(instance => {
                instancesHtml += `
                    <li>
                        <strong>URL:</strong> ${instance.uri}<br>
                        <strong>Méthode:</strong> ${instance.method}<br>
                        ${instance.param ? `<strong>Paramètre:</strong> ${instance.param}<br>` : ''}
                        ${instance.attack ? `<strong>Attaque:</strong> ${instance.attack}<br>` : ''}
                        ${instance.evidence ? `<strong>Preuve:</strong> ${instance.evidence}<br>` : ''}
                    </li>
                `;
            });
            instancesHtml += '</ul>';
        }
        
        modalBody.innerHTML = `
            <div class="alert-details">
                <h2>${alert.name}</h2>
                <div class="alert-meta">
                    <span class="badge badge-${getSeverityClass(alert.riskcode)}">${getSeverityText(alert.riskcode)}</span>
                    <span class="badge badge-secondary">Confiance: ${getConfidenceText(alert.confidence)}</span>
                    ${alert.cweid !== "-1" ? `<span class="badge badge-info">CWE-${alert.cweid}</span>` : ''}
                    ${alert.wascid !== "-1" ? `<span class="badge badge-info">WASC-${alert.wascid}</span>` : ''}
                </div>
                
                <div class="alert-section">
                    <h3>Description</h3>
                    <div>${alert.desc}</div>
                </div>
                
                <div class="alert-section">
                    <h3>Solution</h3>
                    <div>${alert.solution}</div>
                </div>
                
                ${alert.reference ? `
                <div class="alert-section">
                    <h3>Références</h3>
                    <div>${alert.reference}</div>
                </div>
                ` : ''}
                
                ${instancesHtml}
            </div>
        `;
        
        modal.style.display = 'block';
    }
    
    function getSeverityClass(riskcode) {
        switch(riskcode) {
            case "3": return "critical";
            case "2": return "medium";
            case "1": return "low";
            case "0": return "info";
            default: return "info";
        }
    }
    
    function getSeverityText(riskcode) {
        switch(riskcode) {
            case "3": return "Critique";
            case "2": return "Moyenne";
            case "1": return "Faible";
            case "0": return "Informationnelle";
            default: return "Inconnue";
        }
    }
    
    function getConfidenceText(confidence) {
        switch(confidence) {
            case "3": return "Haute";
            case "2": return "Moyenne";
            case "1": return "Faible";
            default: return "Inconnue";
        }
    }
    
    function filterVulnerabilityTable(alerts) {
        const severityFilter = document.getElementById('zap-severity-filter');
        const statusFilter = document.getElementById('zap-status-filter');
        
        if (!severityFilter || !statusFilter) {
            console.warn("Filtres ZAP non trouvés");
            return;
        }
        
        const severityValue = severityFilter.value;
        const statusValue = statusFilter.value;
        
        // Dans un environnement réel, cette fonction filtrerait le tableau
        // Pour cet exemple simplifié, nous rechargerions simplement le tableau
        // Dans la pratique, il faudrait filtrer côté serveur ou client
        
        // Mise à jour simulée - dans un environnement réel, il faudrait implémenter 
        // le filtrage côté client ou envoyer une requête filtrée au serveur
        populateVulnerabilityTable(alerts);
    }
    
    function exportToCSV(alerts) {
        if (!alerts || alerts.length === 0) {
            showNotification("Aucune donnée à exporter", "warning");
            return;
        }
        
        // Création des données CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // En-têtes
        csvContent += "Alerte,Sévérité,Confiance,Instances,CWE,WASC\n";
        
        // Lignes de données
        alerts.forEach(alert => {
            const row = [
                `"${(alert.name || '').replace(/"/g, '""')}"`,
                getSeverityText(alert.riskcode),
                getConfidenceText(alert.confidence),
                alert.count || "0",
                alert.cweid !== "-1" ? alert.cweid : "N/A",
                alert.wascid !== "-1" ? alert.wascid : "N/A"
            ];
            
            csvContent += row.join(",") + "\n";
        });
        
        try {
            // Création du lien de téléchargement
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "zap_vulnerabilities.csv");
            document.body.appendChild(link);
            
            // Déclencher le téléchargement
            link.click();
            
            // Nettoyer
            document.body.removeChild(link);
            
            showNotification("Fichier CSV exporté avec succès", "success");
        } catch (e) {
            console.error("Erreur lors de l'exportation CSV:", e);
            showNotification("Erreur lors de l'exportation CSV", "error");
        }
    }
   