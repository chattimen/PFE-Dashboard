/**
 * NOUVELLE FONCTION : Met à jour les informations du dernier scan dans l'interface
 */
function updateLatestScanInfo(latestScan) {
    if (!latestScan) return;
    
    // Mise à jour des éléments d'information du dernier scan
    const elements = {
        date: document.getElementById('latest-scan-date'),
        tool: document.getElementById('latest-scan-tool'),
        target: document.getElementById('latest-scan-target'),
        status: document.getElementById('latest-scan-status')
    };
    
    if (elements.date) elements.date.textContent = formatDate(latestScan.scan_date);
    if (elements.tool) elements.tool.textContent = formatToolName(latestScan.tool_name);
    if (elements.target) elements.target.textContent = latestScan.target_name;
    
    if (elements.status) {
        elements.status.textContent = formatScanStatus(latestScan.scan_status);
        elements.status.className = `badge status-${latestScan.scan_status}`;
    }
}

/**
 * MISE À JOUR DE LA FONCTION : Chargement des statistiques des vulnérabilités du dernier scan
 */
function loadLatestScanVulnerabilityStats() {
    // Afficher une notification de chargement
    showNotification('<div class="loading-spinner"></div> Chargement des données du dernier scan...', 'loading');
    
    // D'abord, récupérer le dernier scan
    fetch(`${API_BASE_URL}/scans?limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.data.length > 0) {
                const latestScan = data.data[0];
                
                // Mise à jour des informations du dernier scan
                updateLatestScanInfo(latestScan);
                
                // Mise à jour des compteurs dans l'interface
                const criticalElement = document.getElementById('critical-count');
                if (criticalElement) criticalElement.textContent = latestScan.critical_count || 0;
                
                const highElement = document.getElementById('high-count');
                if (highElement) highElement.textContent = latestScan.high_severity_count || 0;
                
                const mediumElement = document.getElementById('medium-count');
                if (mediumElement) mediumElement.textContent = latestScan.medium_severity_count || 0;
                
                const lowElement = document.getElementById('low-count');
                if (lowElement) lowElement.textContent = latestScan.low_severity_count || 0;
                
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
                
                // Masquer la notification de chargement
                hideNotification('loading');
                
                // Afficher un message de succès
                showNotification('Données du dernier scan chargées avec succès', 'success');
            } else {
                console.error('Erreur lors du chargement du dernier scan ou aucun scan trouvé');
                // En cas d'échec, nous utilisons la méthode existante comme fallback
                loadVulnerabilityStats();
                
                // Afficher un message d'erreur
                showNotification('Aucun scan récent trouvé. Affichage des statistiques globales.', 'warning');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la requête API:', error);
            // Fallback en cas d'erreur
            loadVulnerabilityStats();
            
            // Afficher un message d'erreur
            showNotification('Erreur lors du chargement des données. Affichage des statistiques globales.', 'error');
        });
}

/**
 * FONCTION UTILITAIRE : Masquer une notification par type
 */
function hideNotification(type) {
    const notifications = document.querySelectorAll(`.notification.${type}`);
    notifications.forEach(notif => {
        notif.classList.add('fade-out');
        setTimeout(() => {
            notif.remove();
        }, 500);
    });
}

/**
 * MISE À JOUR DE LA FONCTION : Mise à jour du tableau des derniers scans avec pagination
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
            <td>${scan.total_issues || 0}</td>
            <td>${scan.high_severity_count || 0}</td>
            <td>${scan.medium_severity_count || 0}</td>
            <td>${scan.low_severity_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewScanDetails(${scan.id})">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Initialiser les gestionnaires d'événements pour la pagination
    initLatestScansPagination();
}

/**
 * NOUVELLE FONCTION : Initialise les gestionnaires d'événements pour la pagination des derniers scans
 */
function initLatestScansPagination() {
    const prevButton = document.getElementById('latest-scans-prev-page');
    const nextButton = document.getElementById('latest-scans-next-page');
    
    if (prevButton && nextButton) {
        // Les gestionnaires sont déjà définis dans la fonction loadLatestScans
        // Cette fonction est un point d'extension pour des fonctionnalités supplémentaires si nécessaire
    }
}