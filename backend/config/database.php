<?php
/**
 * Configuration de la base de données PostgreSQL
 */

// Paramètres de connexion à la base de données
define('DB_HOST', '192.168.231.128');  // Hôte de la base de données
define('DB_PORT', '5432');       // Port PostgreSQL (par défaut : 5432)
define('DB_NAME', 'security_dashboard');  // Nom de la base de données
define('DB_USER', 'sonartest');   // Nom d'utilisateur PostgreSQL
define('DB_PASS', 'sonartest');   // Mot de passe PostgreSQL (à modifier)

// NOTE: Dans un environnement de production, ces informations devraient être
// stockées dans des variables d'environnement pour une meilleure sécurité
// Exemple:
// define('DB_HOST', getenv('DB_HOST'));
// define('DB_PORT', getenv('DB_PORT'));
// define('DB_NAME', getenv('DB_NAME'));
// define('DB_USER', getenv('DB_USER'));
// define('DB_PASS', getenv('DB_PASS'));