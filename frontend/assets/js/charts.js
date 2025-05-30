/**
 * Configuration et gestion des graphiques du dashboard de sécurité
 */

// Constantes pour les couleurs des graphiques
const CHART_COLORS = {
    critical: '#F75D83', // pink
    high:     '#FFE275', // yellow
    medium:   '#50D1E6', // aqua
    low:      '#4A4AFF', // blue
    info:     '#A3A3A3',

    trivy:     '#4A4AFF',  // primary blue
    sonarqube: '#50D1E6',  // aqua
    owasp_zap: '#F75D83',  // pink
    selenium:  '#FFE275',  // yellow

    success: '#4A4AFF',
    warning: '#FFE275',
    failed:  '#F75D83',

    background: '#F2F2F2',
    text: '#2F2F2F',
    grid: 'rgba(0, 0, 0, 0.05)',

    darkBackground: '#121212',
    darkText: '#ffffff',
    darkGrid: 'rgba(255, 255, 255, 0.1)'
};


/**
 * Configuration par défaut pour tous les graphiques
 */
const defaultChartOptions = (darkMode = false) => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: darkMode ? '#333333' : 'rgba(255, 255, 255, 0.9)',
                titleColor: darkMode ? '#ffffff' : '#333333',
                bodyColor: darkMode ? '#ffffff' : '#333333',
                borderColor: darkMode ? '#555555' : '#dddddd',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: {
                    color: darkMode ? CHART_COLORS.darkGrid : CHART_COLORS.grid
                },
                ticks: {
                    color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: darkMode ? CHART_COLORS.darkGrid : CHART_COLORS.grid
                },
                ticks: {
                    color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                }
            }
        }
    };
};

/**
 * Création d'un graphique en donut pour la distribution des vulnérabilités
 */
function createVulnerabilityDistributionChart(ctx, data, darkMode = false) {
    const { critical, high, medium, low } = data;
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critique', 'Élevée', 'Moyenne', 'Faible'],
            datasets: [{
                data: [critical, high, medium, low],
                backgroundColor: [
                    CHART_COLORS.critical,
                    CHART_COLORS.high,
                    CHART_COLORS.medium,
                    CHART_COLORS.low
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                    }
                },
                title: {
                    display: true,
                    text: 'Distribution des vulnérabilités par sévérité',
                    color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                }
            }
        }

    });
}

/**
 * Création d'un graphique en ligne pour les tendances des vulnérabilités
 */
function createVulnerabilityTrendsChart(ctx, data, darkMode = false) {
    const labels = data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString();
    });
    
    const criticalData = data.map(item => item.critical);
    const highData = data.map(item => item.high);
    const mediumData = data.map(item => item.medium);
    const lowData = data.map(item => item.low);
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Critique',
                    data: criticalData,
                    backgroundColor: `${CHART_COLORS.critical}33`,
                    borderColor: CHART_COLORS.critical,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Élevée',
                    data: highData,
                    backgroundColor: `${CHART_COLORS.high}33`,
                    borderColor: CHART_COLORS.high,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Moyenne',
                    data: mediumData,
                    backgroundColor: `${CHART_COLORS.medium}33`,
                    borderColor: CHART_COLORS.medium,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Faible',
                    data: lowData,
                    backgroundColor: `${CHART_COLORS.low}33`,
                    borderColor: CHART_COLORS.low,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            ...defaultChartOptions(darkMode),
            plugins: {
                ...defaultChartOptions(darkMode).plugins,
                title: {
                    display: true,
                    text: 'Évolution des vulnérabilités au cours du temps',
                    color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                }
            }
        }
    });
}

/**
 * Création d'un graphique en ligne pour les tendances des scans
 */
function createScanTrendsChart(ctx, data, darkMode = false) {
    const labels = data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString();
    });
    
    const trivyData = data.map(item => item.trivy_scans);
    const sonarData = data.map(item => item.sonarqube_scans);
    const zapData = data.map(item => item.zap_scans);
    const seleniumData = data.map(item => item.selenium_scans);
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Trivy',
                    data: trivyData,
                    backgroundColor: `${CHART_COLORS.trivy}33`,
                    borderColor: CHART_COLORS.trivy,
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'SonarQube',
                    data: sonarData,
                    backgroundColor: `${CHART_COLORS.sonarqube}33`,
                    borderColor: CHART_COLORS.sonarqube,
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'OWASP ZAP',
                    data: zapData,
                    backgroundColor: `${CHART_COLORS.owasp_zap}33`,
                    borderColor: CHART_COLORS.owasp_zap,
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Selenium',
                    data: seleniumData,
                    backgroundColor: `${CHART_COLORS.selenium}33`,
                    borderColor: CHART_COLORS.selenium,
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        },
        options: {
            ...defaultChartOptions(darkMode),
            plugins: {
                ...defaultChartOptions(darkMode).plugins,
                title: {
                    display: true,
                    text: 'Évolution des scans au cours du temps',
                    color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                }
            }
        }
    });
}

/**
 * Création d'un graphique en anneau pour le taux de réussite des scans
 */
function createScanSuccessRateChart(ctx, data, toolName, darkMode = false) {
    const { success_count, warning_count, failed_count } = data;
    const total = success_count + warning_count + failed_count;
    
    const successRate = Math.round((success_count / total) * 100);
    const warningRate = Math.round((warning_count / total) * 100);
    const failedRate = Math.round((failed_count / total) * 100);
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Succès', 'Avertissement', 'Échec'],
            datasets: [{
                data: [successRate, warningRate, failedRate],
                backgroundColor: [
                    CHART_COLORS.success,
                    CHART_COLORS.warning,
                    CHART_COLORS.failed
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                    }
                },
                title: {
                    display: true,
                    text: `Taux de réussite des scans ${formatToolName(toolName)}`,
                    color: darkMode ? CHART_COLORS.darkText : CHART_COLORS.text
                }
            }
        }
    });
}

/**
 * Formater le nom de l'outil pour l'affichage
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
 * Mise à jour du thème pour tous les graphiques actifs
 */
function updateChartsTheme(darkMode = false) {
    // Mettre à jour tous les graphiques existants
    Chart.instances.forEach(chart => {
        // Mise à jour des options communes
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.grid.color = darkMode ? CHART_COLORS.darkGrid : CHART_COLORS.grid;
                chart.options.scales.x.ticks.color = darkMode ? CHART_COLORS.darkText : CHART_COLORS.text;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.grid.color = darkMode ? CHART_COLORS.darkGrid : CHART_COLORS.grid;
                chart.options.scales.y.ticks.color = darkMode ? CHART_COLORS.darkText : CHART_COLORS.text;
            }
        }
        
        // Mise à jour des labels de légende
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = darkMode ? CHART_COLORS.darkText : CHART_COLORS.text;
        }
        
        // Mise à jour du titre
        if (chart.options.plugins && chart.options.plugins.title) {
            chart.options.plugins.title.color = darkMode ? CHART_COLORS.darkText : CHART_COLORS.text;
        }
        
        // Appliquer les mises à jour
        chart.update();
    });
}

// Exporter les fonctions
window.createVulnerabilityDistributionChart = createVulnerabilityDistributionChart;
window.createVulnerabilityTrendsChart = createVulnerabilityTrendsChart;
window.createScanTrendsChart = createScanTrendsChart;
window.createScanSuccessRateChart = createScanSuccessRateChart;
window.updateChartsTheme = updateChartsTheme;