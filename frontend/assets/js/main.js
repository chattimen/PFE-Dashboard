/**
 * Script principal du dashboard de sécurité
 */

// Configuration globale
const API_BASE_URL = '/api';
let currentPage = 'dashboard';
let darkMode = localStorage.getItem('darkMode') === 'true';
let zapDataLoaded = false;


let allZapHistory = [];
let allTrivyHistory = [];
let allSonarQubeHistory = [];
let allSeleniumHistory = [];
let allZapVulnerabilities = [];
let allTrivyVulnerabilities = [];
let allSonarQubeVulnerabilities = [];
let allSeleniumVulnerabilities = [];


// Configuration de la pagination
const ITEMS_PER_PAGE = 10;
const paginationState = {
    'zap': { 'vulnerabilities': { currentPage: 1, totalItems: 0, totalPages: 1 }, 'history': { currentPage: 1, totalItems: 0, totalPages: 1 } },
    'trivy': { 'vulnerabilities': { currentPage: 1, totalItems: 0, totalPages: 1 }, 'history': { currentPage: 1, totalItems: 0, totalPages: 1 } },
    'sonarqube': { 'vulnerabilities': { currentPage: 1, totalItems: 0, totalPages: 1 }, 'history': { currentPage: 1, totalItems: 0, totalPages: 1 } },
    'selenium': { 'vulnerabilities': { currentPage: 1, totalItems: 0, totalPages: 1 }, 'history': { currentPage: 1, totalItems: 0, totalPages: 1 } }
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
    const periodSelector = document.getElementById('period-selector');
    const days = periodSelector ? parseInt(periodSelector.value) || 1 : 1;
    
    updatePeriodBasedData(days);
    periodSelector.addEventListener('change', (e) => {
        const newDays = parseInt(e.target.value) || 1;
        updatePeriodBasedData(newDays);
    });

    function updatePeriodBasedData(days) {
        Promise.all([
            fetchVulnerabilities('trivy', days),
            fetchVulnerabilities('zap', days),
            fetchVulnerabilities('sonarqube', days),
            fetchVulnerabilities('selenium', days)
        ]).then(([trivyTotal, zapTotal, sonarqubeTotal, seleniumTotal]) => {
            const totals = {
                critical: 0, high: 0, medium: 0, low: 0
            };
            [allTrivyVulnerabilities, allZapVulnerabilities, allSonarQubeVulnerabilities, allSeleniumVulnerabilities].forEach(vulns => {
                vulns.forEach(vuln => {
                    if (vuln.severity === 'Critical') totals.critical++;
                    else if (vuln.severity === 'High') totals.high++;
                    else if (vuln.severity === 'Medium') totals.medium++;
                    else if (vuln.severity === 'Low') totals.low++;
                });
            });
            document.getElementById('critical-count').textContent = totals.critical;
            document.getElementById('high-count').textContent = totals.high;
            document.getElementById('medium-count').textContent = totals.medium;
            document.getElementById('low-count').textContent = totals.low;
            renderDashboardCharts(totals, days);
        }).catch(error => {
            console.error('Erreur lors du chargement du tableau de bord:', error);
            showNotification('Erreur lors du chargement du tableau de bord', 'error');
        });
    }
}

function renderDashboardCharts(totals, days) {
    const ctxDistribution = document.getElementById('distribution-chart');
    if (!ctxDistribution) {
        console.error('Canvas element #distribution-chart not found');
        return;
    }
    if (window.distributionChart) window.distributionChart.destroy();
    window.distributionChart = new Chart(ctxDistribution, {
        type: 'pie',
        data: {
            labels: ['Critique', 'Élevée', 'Moyenne', 'Faible'],
            datasets: [{
                data: [totals.critical, totals.high, totals.medium, totals.low],
                backgroundColor: ['#ff6384', '#ff9f40', '#ffcd56', '#4bc0c0']
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: `Distribution (${days === 1 ? 'Dernier' : days + ' jours'})` }
        }
    });

    const ctxEvolution = document.getElementById('evolution-chart');
    if (!ctxEvolution) {
        console.error('Canvas element #evolution-chart not found');
        return;
    }
    if (window.evolutionChart) window.evolutionChart.destroy();
    window.evolutionChart = new Chart(ctxEvolution, {
        type: 'line',
        data: {
            labels: ['5/9', '5/10', '5/11', '5/12', '5/13', '5/14', '5/15', '5/16'],
            datasets: [{
                label: 'Critique', data: [0, 0, 0, 0, 0, 0, 0, totals.critical], borderColor: '#ff6384', fill: false
            }, {
                label: 'Élevée', data: [0, 0, 0, 0, 0, 0, 0, totals.high], borderColor: '#ff9f40', fill: false
            }, {
                label: 'Moyenne', data: [0, 0, 0, 0, 0, 0, 0, totals.medium], borderColor: '#ffcd56', fill: false
            }, {
                label: 'Faible', data: [0, 0, 0, 0, 0, 0, 0, totals.low], borderColor: '#4bc0c0', fill: false
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: 'Évolution des vulnérabilités' },
            scales: { yAxes: [{ ticks: { beginAtZero: true } }] }
        }
    });
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
function setupPagination(tableId, totalItems, limit, callback) {
    const paginationContainer = document.querySelector(`#${tableId}-pagination`);
    if (!paginationContainer) return;
    const pageCount = Math.ceil(totalItems / limit);
    paginationContainer.innerHTML = '';
    if (pageCount <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.className = 'btn btn-sm btn-secondary mr-2';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            callback(currentPage);
        }
    };
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= pageCount; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'} mr-1`;
        pageButton.onclick = () => {
            currentPage = i;
            callback(currentPage);
        };
        paginationContainer.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.className = 'btn btn-sm btn-secondary';
    nextButton.disabled = currentPage === pageCount;
    nextButton.onclick = () => {
        if (currentPage < pageCount) {
            currentPage++;
            callback(currentPage);
        }
    };
    paginationContainer.appendChild(nextButton);
}




/**
 * Chargement des données pour une table spécifique
 */
async function loadTableData(toolName, tableType) {
    const state = paginationState[toolName][tableType];
    let allHistory; // Déplacé en haut pour être dans le scope
    
    try {
        if (tableType === 'vulnerabilities') {
            if (!state.totalItems) {
                state.totalItems = await fetchVulnerabilities(toolName);
                state.totalPages = Math.max(1, Math.ceil(state.totalItems / ITEMS_PER_PAGE));
            }
            let paginatedData;
            if (toolName === 'zap') {
                const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                paginatedData = allZapVulnerabilities.slice(startIndex, endIndex) || [];
                console.log(`Paginated ZAP data (page ${state.currentPage}):`, paginatedData);
                processZapData({ site: [{ alerts: paginatedData }] }, state.totalItems);
            } else if (toolName === 'trivy') {
                const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                paginatedData = allTrivyVulnerabilities.slice(startIndex, endIndex) || [];
                console.log(`Paginated Trivy data (page ${state.currentPage}):`, paginatedData);
                updateVulnerabilitiesTable(toolName, paginatedData, state.totalItems);
            } else if (toolName === 'sonarqube') {
                const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                paginatedData = allSonarQubeVulnerabilities.slice(startIndex, endIndex) || [];
                console.log(`Paginated SonarQube data (page ${state.currentPage}):`, paginatedData);
                updateVulnerabilitiesTable(toolName, paginatedData, state.totalItems);
            }
        } else if (tableType === 'history') {
            if (!state.totalItems) {
                state.totalItems = await fetchScanHistory(toolName);
                state.totalPages = 1; // Disable pagination
            }
            let historySource;
            if (toolName === 'zap') {
                historySource = allZapHistory;
            } else if (toolName === 'trivy') {
                historySource = allTrivyHistory;
            } else if (toolName === 'sonarqube') {
                historySource = allSonarQubeHistory;
            } else if (toolName === 'selenium') {
                historySource = allSeleniumHistory;
            }
            allHistory = historySource ? historySource : [];
            updateHistoryTable(toolName, allHistory, allHistory.length);
        }

        const pageInfo = document.getElementById(`${toolName}-${tableType}-page-info`);
        if (pageInfo && tableType === 'history') {
            pageInfo.textContent = `Tous les scans (${allHistory ? allHistory.length : 0} entrées)`;
        } else if (pageInfo) {
            pageInfo.textContent = `Page ${state.currentPage} sur ${state.totalPages}`;
        }
        const prevButton = document.getElementById(`${toolName}-${tableType}-prev-page`);
        const nextButton = document.getElementById(`${toolName}-${tableType}-next-page`);
        if (prevButton && nextButton) {
            prevButton.style.display = tableType === 'history' ? 'none' : 'inline-block';
            nextButton.style.display = tableType === 'history' ? 'none' : 'inline-block';
            if (tableType !== 'history') {
                prevButton.onclick = () => {
                    if (state.currentPage > 1) {
                        state.currentPage--;
                        loadTableData(toolName, tableType);
                    }
                };
                nextButton.onclick = () => {
                    if (state.currentPage < state.totalPages) {
                        state.currentPage++;
                        loadTableData(toolName, tableType);
                    }
                };
                prevButton.disabled = state.currentPage <= 1;
                nextButton.disabled = state.currentPage >= state.totalPages;
                console.log(`Boutons mis à jour: Précédent=${prevButton.disabled}, Suivant=${nextButton.disabled}`);
            }
        } else {
            console.warn(`Pagination buttons not found for ${toolName}-${tableType}`);
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
function initTrivyPage() {
    const periodSelector = document.getElementById('trivy-period-selector');
    const days = periodSelector ? parseInt(periodSelector.value) || 1 : 1;
    
    loadTrivyData(days);
    periodSelector.addEventListener('change', (e) => {
        const newDays = parseInt(e.target.value) || 1;
        loadTrivyData(newDays);
    });

    function loadTrivyData(days) {
        fetchVulnerabilities('trivy', days).then(total => {
            updateTrivyOverview(total);
            renderTrivyCharts(allTrivyVulnerabilities, days);
            populateVulnerabilityTable('trivy', allTrivyVulnerabilities.slice(0, ITEMS_PER_PAGE));
            setupPagination('trivy', 'vulnerabilities', total, (page) => {
                const start = (page - 1) * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                populateVulnerabilityTable('trivy', allTrivyVulnerabilities.slice(start, end));
            });
        }).catch(error => {
            console.error('Erreur lors du chargement des données Trivy:', error);
            showNotification('Erreur lors du chargement des données Trivy', 'error');
        });
    }
}

/**
 * Initialisation de la page SonarQube
 */
function initSonarQubePage() {
    const periodSelector = document.getElementById('sonarqube-period-selector');
    const days = periodSelector ? parseInt(periodSelector.value) || 1 : 1;
    
    loadSonarQubeIssueStats(days);
    periodSelector.addEventListener('change', (e) => {
        const newDays = parseInt(e.target.value) || 1;
        loadSonarQubeIssueStats(newDays);
    });

    function loadSonarQubeIssueStats(days) {
        fetchVulnerabilities('sonarqube', days).then(() => {
            const issues = allSonarQubeVulnerabilities;
            let bugCount = 0, vulnCount = 0, smellCount = 0;
            issues.forEach(issue => {
                if (issue.category === 'BUG') bugCount++;
                else if (issue.category === 'VULNERABILITY') vulnCount++;
                else if (issue.category === 'CODE_SMELL') smellCount++;
            });
            document.getElementById('sonar-bugs-count').textContent = bugCount;
            document.getElementById('sonar-vulnerabilities-count').textContent = vulnCount;
            document.getElementById('sonar-code-smells-count').textContent = smellCount;
            renderSonarQubeCharts(issues, days);
            populateSonarQubeIssuesTable(issues);
        }).catch(error => {
            console.error('Erreur lors du chargement des données SonarQube:', error);
            showNotification('Erreur lors du chargement des données SonarQube', 'error');
        });
    }
}

/**
 * Initialisation de la page OWASP ZAP
 */
function initZapPage() {
    const periodSelector = document.getElementById('zap-period-selector');
    const days = periodSelector ? parseInt(periodSelector.value) || 1 : 1;
    
    loadZapData(days);
    periodSelector.addEventListener('change', (e) => {
        const newDays = parseInt(e.target.value) || 1;
        loadZapData(newDays);
    });
}
/**
 * Initialisation de la page Selenium
 */
function initSeleniumPage() {
    const periodSelector = document.getElementById('selenium-period-selector');
    const days = periodSelector ? parseInt(periodSelector.value) || 1 : 1;
    
    loadSeleniumData(days);
    periodSelector.addEventListener('change', (e) => {
        const newDays = parseInt(e.target.value) || 1;
        loadSeleniumData(newDays);
    });

    function loadSeleniumData(days) {
        fetchVulnerabilities('selenium', days).then(total => {
            updateSeleniumOverview(total);
            renderSeleniumCharts(allSeleniumVulnerabilities, days);
            populateFailedTestsTable(allSeleniumVulnerabilities.slice(0, ITEMS_PER_PAGE));
            setupPagination('selenium', 'tests', total, (page) => {
                const start = (page - 1) * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                populateFailedTestsTable(allSeleniumVulnerabilities.slice(start, end));
            });
        }).catch(error => {
            console.error('Erreur lors du chargement des données Selenium:', error);
            showNotification('Erreur lors du chargement des données Selenium', 'error');
        });
    }
}
/**
 * Updates Trivy overview with total vulnerabilities
 */
function updateTrivyOverview(total) {
    document.getElementById('trivy-scans-count').textContent = total > 0 ? 1 : 0; // Assume 1 scan for now
    document.getElementById('trivy-vulnerabilities-count').textContent = total;
}
/**
 * Renders Trivy charts based on vulnerabilities
 */
function renderTrivyCharts(vulnerabilities, days) {
    const ctx = document.getElementById('trivy-severity-chart');
    if (!ctx) {
        console.error('Canvas element #trivy-severity-chart not found');
        return;
    }
    if (window.trivyChart) window.trivyChart.destroy();
    window.trivyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Critique', 'Élevée', 'Moyenne', 'Faible'],
            datasets: [{
                label: 'Vulnérabilités',
                data: [
                    vulnerabilities.filter(v => v.severity === 'Critical').length,
                    vulnerabilities.filter(v => v.severity === 'High').length,
                    vulnerabilities.filter(v => v.severity === 'Medium').length,
                    vulnerabilities.filter(v => v.severity === 'Low').length
                ],
                backgroundColor: ['#ff6384', '#ff9f40', '#ffcd56', '#4bc0c0']
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: `Vulnérabilités par sévérité (${days === 1 ? 'Dernier' : days + ' jours'})` }
        }
    });
}
/**
 * Populates the failed tests table for Selenium
 */
function populateFailedTestsTable(vulnerabilities) {
    const tableBody = document.querySelector('#selenium-failed-tests-table tbody');
    if (!tableBody) {
        console.warn('Table body #selenium-failed-tests-table tbody not found');
        return;
    }
    tableBody.innerHTML = '';
    const failedTests = vulnerabilities.filter(v => v.status === 'Failed');
    if (!failedTests || failedTests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">Aucun test échoué</td></tr>';
        return;
    }
    failedTests.forEach(test => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${test.name || 'N/A'}</td>
            <td>${test.suite || 'N/A'}</td>
            <td>${test.date || 'N/A'}</td>
            <td>${test.duration || 'N/A'}</td>
            <td>${test.error || 'N/A'}</td>
            <td><button class="btn">Actions</button></td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Renders SonarQube charts based on issues
 */
function renderSonarQubeCharts(issues, days) {
    const ctxEvolution = document.getElementById('sonarqube-evolution-chart');
    if (!ctxEvolution) {
        console.error('Canvas element #sonarqube-evolution-chart not found');
        return;
    }
    if (window.sonarqubeEvolutionChart) window.sonarqubeEvolutionChart.destroy();
    window.sonarqubeEvolutionChart = new Chart(ctxEvolution, {
        type: 'line',
        data: {
            labels: ['5/9', '5/10', '5/11', '5/12', '5/13', '5/14', '5/15', '5/16'],
            datasets: [{
                label: 'Bugs', data: [0, 0, 0, 0, 0, 0, 0, issues.filter(i => i.category === 'BUG').length], borderColor: '#ff6384', fill: false
            }, {
                label: 'Vulnérabilités', data: [0, 0, 0, 0, 0, 0, 0, issues.filter(i => i.category === 'VULNERABILITY').length], borderColor: '#ff9f40', fill: false
            }, {
                label: 'Code Smells', data: [0, 0, 0, 0, 0, 0, 0, issues.filter(i => i.category === 'CODE_SMELL').length], borderColor: '#ffcd56', fill: false
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: 'Évolution des problèmes' }
        }
    });
}
/**
 * Updates Selenium overview with total tests
 */
function updateSeleniumOverview(total) {
    document.getElementById('selenium-tests-count').textContent = total;
    document.getElementById('selenium-success-rate').textContent = total > 0 ? '100%' : '0%'; // Placeholder
    document.getElementById('selenium-failed-count').textContent = 0; // Placeholder
    document.getElementById('selenium-avg-duration').textContent = '0s'; // Placeholder
}
/**
 * Renders Selenium charts based on test results
 */
function renderSeleniumCharts(vulnerabilities, days) {
    const ctxResults = document.getElementById('selenium-results-chart');
    if (!ctxResults) {
        console.error('Canvas element #selenium-results-chart not found');
        return;
    }
    if (window.seleniumResultsChart) window.seleniumResultsChart.destroy();
    window.seleniumResultsChart = new Chart(ctxResults, {
        type: 'bar',
        data: {
            labels: ['Succès', 'Échecs'],
            datasets: [{
                label: 'Tests',
                data: [vulnerabilities.filter(v => v.status === 'Success').length, vulnerabilities.filter(v => v.status === 'Failed').length],
                backgroundColor: ['#4bc0c0', '#ff6384']
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: `Résultats (${days === 1 ? 'Dernier' : days + ' jours'})` }
        }
    });
}
/**
 * Populates the SonarQube issues table
 */
function populateSonarQubeIssuesTable(issues) {
    const tableBody = document.querySelector('#sonarqube-issues-table tbody');
    if (!tableBody) {
        console.warn('Table body #sonarqube-issues-table tbody not found');
        return;
    }
    tableBody.innerHTML = '';
    if (!issues || issues.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">Aucun problème</td></tr>';
        return;
    }
    issues.forEach(issue => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${issue.title || 'N/A'}</td>
            <td>${issue.category || 'N/A'}</td>
            <td>${issue.severity || 'N/A'}</td>
            <td>${issue.file || 'N/A'}</td>
            <td>${issue.line || 'N/A'}</td>
            <td>${issue.status || 'N/A'}</td>
            <td><button class="btn">Actions</button></td>
        `;
        tableBody.appendChild(row);
    });
}
/**
 * Récupération des vulnérabilités par outil
 */
async function fetchScanHistory(toolName, limit = 50, offset = 0) {
    try {
        const response = await fetch(`${API_BASE_URL}/scans?tool_name=${toolName}&limit=${limit}&offset=${offset}`);
        const data = await response.json();

        if (data.status === 'success') {
            updateScanHistoryTable(data.data, toolName);
            setupPagination(`${toolName}-history`, data.total, limit, (page) => {
                const newOffset = (page - 1) * limit;
                fetchScanHistory(toolName, limit, newOffset);
            });
        } else {
            console.error(`Erreur API pour l'historique ${toolName}:`, data.message);
        }
    } catch (error) {
        console.error(`Erreur réseau/API pour l'historique ${toolName}:`, error);
    }
}

/**
 * Load vulnerabilities for a specific tool (used by all tools: Trivy, SonarQube, ZAP, Selenium)
 */
async function loadToolVulnerabilities(toolName, scanId = null) {
    const tableBody = document.querySelector(`#${toolName}-vulnerabilities-table tbody`);
    if (!tableBody) {
        console.warn(`Table body for ${toolName} vulnerabilities not found`);
        return;
    }
    const data = await fetchVulnerabilities(toolName, scanId);
    tableBody.innerHTML = '';
    if (!data.vulnerabilities || data.vulnerabilities.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune vulnérabilité trouvée</td></tr>';
        return;
    }
    data.vulnerabilities.forEach((vuln, index) => {
        const row = document.createElement('tr');
        const severityLevel = vuln.severity?.toLowerCase() || "medium";
        row.classList.add(`severity-${severityLevel}`);
        row.innerHTML = `
            <td>${vuln.title || 'N/A'}</td>
            <td><span class="badge severity-${severityLevel}">${vuln.severity || 'Medium'}</span></td>
            <td>${vuln.location || 'N/A'}</td>
            <td>${vuln.category || 'N/A'}</td>
            <td>${vuln.status || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-info" data-vuln-index="${index}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    setupPagination(toolName, data.total, 50, (page) => loadToolVulnerabilities(toolName, scanId, page));
}
/**
 * Chargement des statistiques SonarQube
 */
async function loadSonarQubeIssueStats() {
    const periodSelector = document.getElementById('period-selector');
    const days = periodSelector ? parseInt(periodSelector.value) || 30 : 30;
    try {
<<<<<<< HEAD
        const limit = getDynamicLimit(days, 'sonarqube');
        const response = await fetch(`${API_BASE_URL}/vulnerabilities?tool_name=sonarqube&days=${days}&limit=${limit}`);
=======
        const response = await fetch(`${API_BASE_URL}/vulnerabilities?tool_name=sonarqube&limit=100`);
>>>>>>> 17d3981 (okay point 0)
        const data = await response.json();

        if (data.status !== 'success') {
            console.error('Erreur de récupération des vulnérabilités SonarQube');
            return;
        }

        const issues = data.data || [];

        let bugCount = 0;
        let vulnCount = 0;
        let smellCount = 0;

        issues.forEach(issue => {
            const type = issue.category?.toUpperCase();
            if (type === 'BUG') bugCount++;
            else if (type === 'VULNERABILITY') vulnCount++;
            else if (type === 'CODE_SMELL') smellCount++;
        });

        document.getElementById('sonar-bugs-count').textContent = bugCount;
        document.getElementById('sonar-vulnerabilities-count').textContent = vulnCount;
        document.getElementById('sonar-code-smells-count').textContent = smellCount;

    } catch (error) {
        console.error('Erreur lors du chargement des statistiques SonarQube:', error);
    }
}


/**
 * Load scan history for a specific tool (used by all tools: Trivy, SonarQube, ZAP, Selenium)
 */
async function loadToolScanHistory(toolName) {
    const tableBody = document.querySelector(`#${toolName}-scan-history-table tbody`);
    if (!tableBody) {
        console.warn(`Table body for ${toolName} scan history not found`);
        return;
    }
    const data = await fetchScanHistory(toolName);
    tableBody.innerHTML = '';
    if (!data.scans || data.scans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Aucun scan trouvé</td></tr>';
        return;
    }
    data.scans.forEach(scan => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${scan.id || 'N/A'}</td>
            <td>${new Date(scan.timestamp).toLocaleString() || 'N/A'}</td>
            <td>${scan.status || 'N/A'}</td>
            <td>${scan.vulnerability_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-info" data-scan-id="${scan.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    setupPagination(`${toolName}-history`, data.total, 50, (page) => loadToolScanHistory(toolName, page));
}

/**
 * Récupération des vulnérabilités
 */

async function fetchVulnerabilities(toolName, days = 30) {
    let text = '';
    try {
<<<<<<< HEAD
        const limit = getDynamicLimit(days, toolName);
        const response = await fetch(`${API_BASE_URL}/vulnerabilities?tool_name=${toolName}&days=${days}&limit=${limit}`);
=======
        const response = await fetch(`${API_BASE_URL}/vulnerabilities?tool_name=${toolName}&limit=5000`);
>>>>>>> 17d3981 (okay point 0)
        text = await response.text();
        let cleanedText = text.replace(/null$/, '').trim();
        const lastValidBracket = cleanedText.lastIndexOf('}');
        if (lastValidBracket !== -1) {
            cleanedText = cleanedText.substring(0, lastValidBracket + 1);
        }
        const data = JSON.parse(cleanedText);
        console.log(`${toolName} vulnerabilities API response:`, data);
        if (data.status === 'success') {
            const totalItems = data.total || data.data.length;
            const vulnData = data.data || [];
            const filteredData = vulnData.filter(vuln => vuln.tool_name?.toLowerCase() === toolName.toLowerCase());
            if (toolName === 'zap') {
                allZapVulnerabilities = filteredData;
                console.log(`Stored ${filteredData.length} vulnerabilities for zap`);
            } else if (toolName === 'trivy') {
                allTrivyVulnerabilities = filteredData;
                console.log(`Stored ${filteredData.length} vulnerabilities for trivy`);
            } else if (toolName === 'sonarqube') {
                allSonarQubeVulnerabilities = filteredData;
                console.log(`Stored ${filteredData.length} vulnerabilities for sonarqube`);
            } else if (toolName === 'selenium') {
                allSeleniumVulnerabilities = filteredData;
                console.log(`Stored ${filteredData.length} vulnerabilities for selenium`);
            }
            return totalItems;
        } else {
            console.error(`Erreur vulnérabilités ${toolName}:`, data.message);
            showNotification(`Erreur chargement vulnérabilités ${toolName}`, 'error');
            return 0;
        }
    } catch (error) {
        console.error(`Erreur API vulnérabilités ${toolName}:`, error.message, 'Raw response:', text);
        showNotification(`Erreur chargement vulnérabilités ${toolName}: JSON invalide`, 'error');
        return 0;
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

function getDynamicLimit(days, toolName) {
    const tool = toolName.toLowerCase();
    
    // For "Dernier" (latest scan), use a low limit to fetch only the most recent scan's data
    if (days === 1) {
        if (tool === 'trivy') return 2000; // Trivy: ~1778 vulnerabilities/scan, so cover one scan
        if (tool === 'zap') return 500; // ZAP: ~310 vulnerabilities, so cover one scan
        if (tool === 'sonarqube') return 1000; // SonarQube: Unknown, assume moderate volume
        if (tool === 'selenium') return 500; // Selenium: Assume similar to ZAP
        return 500; // Default for other tools
    }
    
    // For other periods, scale limit based on expected data volume
    if (days <= 7) { // "7 jours"
        if (tool === 'trivy') return 10000; // Trivy: ~5-6 scans (13 total / 30 days * 7 days), ~8900-10668 vulnerabilities
        if (tool === 'zap') return 1500; // ZAP: ~2-3 scans, ~600-900 vulnerabilities
        if (tool === 'sonarqube') return 5000; // SonarQube: Unknown, assume moderate-high volume
        if (tool === 'selenium') return 1500; // Selenium: Assume similar to ZAP
        return 2000; // Default
    }
    
    if (days <= 30) { // "30 jours"
        if (tool === 'trivy') return 25000; // Trivy: ~13 scans, ~23120 vulnerabilities
        if (tool === 'zap') return 4000; // ZAP: ~8-10 scans, ~2400-3100 vulnerabilities
        if (tool === 'sonarqube') return 10000; // SonarQube: Unknown, assume high volume
        if (tool === 'selenium') return 4000; // Selenium: Assume similar to ZAP
        return 5000; // Default
    }
    
    // Longer periods
    if (tool === 'trivy') return 30000; // Trivy: Cover all possible vulnerabilities
    if (tool === 'zap') return 6000; // ZAP: Cover extended periods
    if (tool === 'sonarqube') return 15000; // SonarQube: Assume high volume
    if (tool === 'selenium') return 6000; // Selenium: Assume similar to ZAP
    return 10000; // Default
}

/**
 * Récupération de l'historique des scans par outil
 */
function fetchScanHistory(toolName, days = 30) {
    const limit = getDynamicLimit(days, toolName);
    fetch(`${API_BASE_URL}/scans?tool_name=${toolName}&days=${days}&limit=${limit}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(`Erreur HTTP! Statut: ${response.status}, Message: ${errorData.message || response.statusText}`);
                }).catch(() => {
                    throw new Error(`Erreur HTTP! Statut: ${response.status}, Message: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                updateScanHistoryTable(data.data, toolName);
            } else {
                console.error(`Erreur logique API lors du chargement de l'historique des scans ${toolName}:`, data.message);
                showNotification(`L'API a signalé une erreur pour l'historique ${toolName}: ${data.message}`, 'warning');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API ou du traitement de la réponse:', error);
            showNotification(`Erreur lors du chargement de l'historique des scans ${toolName}: ${error.message || error}`, 'error');
        });
}
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
 * Mise à jour de la table d'historique des scans
 */
function updateHistoryTable(toolName, historyData, totalItems) {
    const tableBody = document.querySelector(`#${toolName}-history-table tbody`);
    if (!tableBody) {
        console.warn(`Corps de la table #${toolName}-history-table non trouvé`);
        return;
    }
    tableBody.innerHTML = '';
    if (!historyData || historyData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Aucun historique trouvé</td></tr>';
        return;
    }
    historyData.forEach((scan, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(scan.scan_date).toLocaleString() || 'N/A'}</td>
            <td>${scan.target_name || scan.tool_name || 'N/A'}</td>
            <td>${scan.scan_status || 'N/A'}</td>
            <td>${scan.total_issues || 'N/A'}</td>
            <td>${scan.high_severity_count || '0'}</td>
            <td>${scan.medium_severity_count || '0'}</td>
            <td>${scan.low_severity_count || '0'}</td>
            <td>
                <button class="btn btn-sm btn-info view-scan-details" data-scan-index="${index}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    const detailButtons = document.querySelectorAll(`#${toolName}-history-table .view-scan-details`);
    detailButtons.forEach(button => {
        button.addEventListener('click', () => {
            const scanIndex = button.getAttribute('data-scan-index');
        });
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
 * Fonction utilitaire pour charger les scans avec pagination
 */
async function fetchLatestScansWithPagination(days, limit, offset) {
    try {
        const dynamicLimit = getDynamicLimit(days, 'all'); // Use 'all' for consistency
        const response = await fetch(`${API_BASE_URL}/scans?days=${days}&limit=${dynamicLimit}&offset=${offset}`);
        const data = await response.json();
        if (data.status === 'success') {
            updateLatestScansTable(data.data);
        } else {
            console.error('Erreur lors du chargement des scans:', data.message);
            showNotification('Erreur lors du chargement des scans', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la requête API:', error);
        showNotification('Erreur lors du chargement des scans', 'error');
    }
}
/**
 * Chargement des derniers scans pour toutes les catégories
 */
async function loadLatestScans(days = 30) {
    try {
        const limit = getDynamicLimit(days, 'all'); // Use 'all' as a generic tool for latest scans
        const response = await fetch(`${API_BASE_URL}/scans?days=${days}&limit=${limit}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const totalItems = data.total || data.data.length;
            setupPagination('latest-scans', totalItems, ITEMS_PER_PAGE, (page) => {
                const offset = (page - 1) * ITEMS_PER_PAGE;
                fetchLatestScansWithPagination(days, ITEMS_PER_PAGE, offset);
            });
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
                    const apiSeverity = vuln.severity || vuln.riskdesc || "Medium";
                    const severity = apiSeverity.toLowerCase();
                    const riskCode = vuln.riskcode || mapSeverityToRiskCode(severity);
                    // Vérifier la cohérence entre riskcode et severity
                    const severityFromRiskCode = mapRiskCodeToSeverity(riskCode);
                    return {
                        "pluginid": vuln.id || "N/A",
                        "alertRef": vuln.id || "N/A",
                        "alert": vuln.title || "Unknown Vulnerability",
                        "name": vuln.title || "Unknown Vulnerability",
                        "riskcode": riskCode,
                        "confidence": "2",
                        "riskdesc": severityFromRiskCode, // Utiliser la sévérité dérivée de riskcode
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


/**
 * Fonction pour mapper la sévérité en code de risque
 */
function mapSeverityToRiskCode(severity) {
    const severityMap = {
        "critical": "4",
        "high": "3",
        "medium": "2",
        "low": "1",
        "info": "0"
    };
    const mappedCode = severityMap[severity.toLowerCase()] || "2";
    return mappedCode;
}


/**
 * Chargement des données ZAP
 */
async function loadZapData(days) {
    if (zapDataLoaded) return;
    zapDataLoaded = true;
    try {
        const latestScanId = await fetchLatestScanId('zap', days);
        if (!latestScanId) {
            console.error('Aucun scan récent ZAP');
            showNotification('Aucun scan récent ZAP', 'error');
            zapDataLoaded = false;
            return;
        }
        const response = await fetch(`${API_BASE_URL}/vulnerabilities?tool_name=zap&scan_id=${latestScanId}&days=${days}&limit=${getDynamicLimit(days, 'zap')}`);
        const data = await response.json();
        if (data.status === 'success') {
            const totalItems = data.total || data.data.length;
            allZapVulnerabilities = transformApiDataToZapFormat(data.data).site[0].alerts;
            renderZapCharts(allZapVulnerabilities, days);
            populateVulnerabilityTable('zap', allZapVulnerabilities.slice(0, ITEMS_PER_PAGE));
            setupPagination('zap', 'vulnerabilities', totalItems, (page) => {
                const start = (page - 1) * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                populateVulnerabilityTable('zap', allZapVulnerabilities.slice(start, end));
            });
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
/**
 * Renders ZAP charts based on vulnerabilities
 */
function renderZapCharts(vulnerabilities, days) {
    const ctxDistribution = document.getElementById('zap-distribution-chart');
    if (!ctxDistribution) {
        console.error('Canvas element #zap-distribution-chart not found');
        return;
    }
    if (window.zapDistributionChart) window.zapDistributionChart.destroy();
    window.zapDistributionChart = new Chart(ctxDistribution, {
        type: 'pie',
        data: {
            labels: ['Critique', 'Élevée', 'Moyenne', 'Faible/Info'],
            datasets: [{
                data: [
                    vulnerabilities.filter(v => v.riskdesc === 'High').length,
                    vulnerabilities.filter(v => v.riskdesc === 'Medium').length,
                    vulnerabilities.filter(v => v.riskdesc === 'Low').length,
                    vulnerabilities.filter(v => v.riskdesc === 'Informational').length
                ],
                backgroundColor: ['#ff6384', '#ff9f40', '#ffcd56', '#4bc0c0']
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: `Distribution (${days === 1 ? 'Dernier' : days + ' jours'})` }
        }
    });
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
/**
 * Fonction pour mapper le code de risque en sévérité
 */
function mapRiskCodeToSeverity(riskCode) {
    const riskCodeMap = {
        "4": "Critical",
        "3": "High",
        "2": "Medium",
        "1": "Low",
        "0": "Info"
    };
    const severity = riskCodeMap[riskCode] || "Medium";
    return severity;
}

/**
 * Remplissage de la table des vulnérabilités (correction pour définir row correctement)
 */
/**
 * Populates the vulnerability table for a given tool
 */
function populateVulnerabilityTable(tool, vulnerabilities) {
    const tableBody = document.querySelector(`#${tool}-vulnerabilities-table tbody`);
    if (!tableBody) {
        console.warn(`Table body #${tool}-vulnerabilities-table tbody not found`);
        return;
    }
    tableBody.innerHTML = '';
    if (!vulnerabilities || vulnerabilities.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">Aucune vulnérabilité</td></tr>';
        return;
    }
    vulnerabilities.forEach(vuln => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vuln.title || 'N/A'}</td>
            <td>${vuln.severity || 'N/A'}</td>
            <td>${vuln.location || 'N/A'}</td>
            <td>${vuln.id || 'N/A'}</td>
            <td>${vuln.date || 'N/A'}</td>
            <td>${vuln.status || 'N/A'}</td>
            <td><button class="btn">Actions</button></td>
        `;
        tableBody.appendChild(row);
    });
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
                        alert.riskcode === "4" ? "critical" : 
                        alert.riskcode === "3" ? "high" : 
                        alert.riskcode === "2" ? "medium" : "low"
                    }">${formatSeverity(
                        alert.riskcode === "4" ? "critical" : 
                        alert.riskcode === "3" ? "high" : 
                        alert.riskcode === "2" ? "medium" : "low"
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