<?php
/**
 * Point d'entrée principal du Dashboard de Sécurité
 * Ce fichier redirige vers l'interface frontend ou gère les requêtes API
 */

// Détecter si la requête est destinée à l'API
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
    // Rediriger vers le backend API
    require_once __DIR__ . '/backend/api/index.php';
    exit;
}

// Sinon, rediriger vers l'interface frontend
header('Location: frontend/views/index.html');

exit;