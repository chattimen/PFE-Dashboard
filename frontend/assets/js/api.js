/**
 * Module de gestion des appels API pour le dashboard de sécurité
 */

// Configuration de base
const API_BASE = '/api';

/**
 * Classe de gestion des appels API
 */
class SecurityAPI {
    /**
     * Constructeur
     * @param {string} baseUrl - URL de base de l'API
     */
    constructor(baseUrl = API_BASE) {
        this.baseUrl = baseUrl;
    }
    
    /**
     * Fonction utilitaire pour effectuer des requêtes HTTP
     * @param {string} endpoint - Endpoint de l'API
     * @param {string} method - Méthode HTTP (GET, POST, PUT, PATCH, DELETE)
     * @param {object} data - Données à envoyer (optionnel)
     * @param {object} params - Paramètres de requête (optionnel)
     * @returns {Promise} - Promesse avec les données de réponse
     */
    async request(endpoint, method = 'GET', data = null, params = null) {
        // Construire l'URL avec les paramètres de requête
        let url = `${this.baseUrl}${endpoint}`;
        
        if (params) {
            const queryParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    queryParams.append(key, params[key]);
                }
            });
            
            const queryString = queryParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }
        
        // Options de la requête
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Ajouter le corps de la requête si nécessaire
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            // Vérifier si la réponse est OK
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
            }
            
            // Parser la réponse JSON
            const responseData = await response.json();
            return responseData;
        } catch (error) {
            console.error(`Erreur API (${method} ${endpoint}):`, error);
            throw error;
        }
    }
    
    /**
     * Récupérer toutes les vulnérabilités avec filtres
     * @param {object} filters - Filtres (tool_name, severity, status, etc.)
     * @param {number} limit - Limite de résultats
     * @param {number} offset - Décalage pour la pagination
     * @returns {Promise} - Liste des vulnérabilités
     */
    async getVulnerabilities(filters = {}, limit = 100, offset = 0) {
        return this.request('/vulnerabilities', 'GET', null, { ...filters, limit, offset });
    }
    
    /**
     * Récupérer les détails d'une vulnérabilité
     * @param {number} id - ID de la vulnérabilité
     * @returns {Promise} - Détails de la vulnérabilité
     */
    async getVulnerabilityDetails(id) {
        return this.request(`/vulnerabilities/${id}`, 'GET');
    }
    
    /**
     * Mettre à jour le statut d'une vulnérabilité
     * @param {number} id - ID de la vulnérabilité
     * @param {string} status - Nouveau statut
     * @returns {Promise} - Résultat de la mise à jour
     */
    async updateVulnerabilityStatus(id, status) {
        return this.request(`/vulnerabilities/${id}`, 'PATCH', { status });
    }
    
    /**
     * Récupérer les statistiques des vulnérabilités
     * @param {object} filters - Filtres (tool_name, days, etc.)
     * @returns {Promise} - Statistiques des vulnérabilités
     */
    async getVulnerabilityStats(filters = {}) {
        return this.request('/vulnerabilities/stats', 'GET', null, filters);
    }
    
    /**
     * Récupérer les tendances des vulnérabilités
     * @param {number} days - Nombre de jours à analyser
     * @returns {Promise} - Tendances des vulnérabilités
     */
    async getVulnerabilityTrends(days = 30) {
        return this.request('/vulnerabilities/trends', 'GET', null, { days });
    }
    
    /**
     * Récupérer tous les scans avec filtres
     * @param {object} filters - Filtres (tool_name, scan_status, etc.)
     * @param {number} limit - Limite de résultats
     * @param {number} offset - Décalage pour la pagination
     * @returns {Promise} - Liste des scans
     */
    async getScans(filters = {}, limit = 50, offset = 0) {
        return this.request('/scans', 'GET', null, { ...filters, limit, offset });
    }
    
    /**
     * Récupérer les détails d'un scan
     * @param {number} id - ID du scan
     * @returns {Promise} - Détails du scan
     */
    async getScanDetails(id) {
        return this.request(`/scans/${id}`, 'GET');
    }
    
    /**
     * Récupérer les statistiques des scans
     * @param {number} days - Nombre de jours à analyser
     * @returns {Promise} - Statistiques des scans
     */
    async getScanStats(days = 30) {
        return this.request('/scans/stats', 'GET', null, { days });
    }
    
    /**
     * Récupérer les tendances des scans
     * @param {number} days - Nombre de jours à analyser
     * @returns {Promise} - Tendances des scans
     */
    async getScanTrends(days = 30) {
        return this.request('/scans/trends', 'GET', null, { days });
    }
    
    /**
     * Récupérer les métriques pour un outil
     * @param {string} toolName - Nom de l'outil
     * @param {object} filters - Filtres additionnels
     * @returns {Promise} - Métriques de l'outil
     */
    async getMetrics(toolName, filters = {}) {
        return this.request('/metrics', 'GET', null, { tool_name: toolName, ...filters });
    }
    
    /**
     * Récupérer les configurations des outils
     * @returns {Promise} - Configurations des outils
     */
    async getToolConfigs() {
        return this.request('/tools/configs', 'GET');
    }
    
    /**
     * Mettre à jour la configuration d'un outil
     * @param {string} toolName - Nom de l'outil
     * @param {object} config - Nouvelle configuration
     * @returns {Promise} - Résultat de la mise à jour
     */
    async updateToolConfig(toolName, config) {
        return this.request(`/tools/configs/${toolName}`, 'PUT', config);
    }
}

// Instance globale de l'API
const securityAPI = new SecurityAPI();

// Exportation de l'API
window.securityAPI = securityAPI;