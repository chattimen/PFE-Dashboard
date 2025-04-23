<?php
/**
 * Classe de connexion à la base de données PostgreSQL
 */
class Database {
    private static $instance = null;
    private $conn;
    
    /**
     * Constructeur privé pour empêcher l'instanciation directe
     */
    private function __construct() {
        // Chargement de la configuration de la base de données
        require_once __DIR__ . '/../config/database.php';
        
        try {
            $dsn = "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $this->conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Erreur de connexion à la base de données: " . $e->getMessage());
            throw new Exception("Erreur de connexion à la base de données. Veuillez contacter l'administrateur.");
        }
    }
    
    /**
     * Méthode singleton pour obtenir l'instance de la classe
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Obtenir la connexion PDO
     */
    public function getConnection() {
        return $this->conn;
    }
    
    /**
     * Exécute une requête avec paramètres et retourne le résultat
     */
    public function query($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Erreur d'exécution de la requête: " . $e->getMessage());
            throw new Exception("Erreur lors de l'exécution de la requête.");
        }
    }
    
    /**
     * Récupère toutes les lignes d'une requête
     */
    public function fetchAll($sql, $params = []) {
        try {
            return $this->query($sql, $params)->fetchAll();
        } catch (PDOException $e) {
            error_log("Erreur fetchAll: " . $e->getMessage());
            throw $e; // Optional: to propagate it
        }
    }
    
    /**
     * Récupère une seule ligne d'une requête
     */
    public function fetchOne($sql, $params = []) {
        return $this->query($sql, $params)->fetch();
    }
    
    /**
     * Insère des données et retourne l'ID généré
     */
    public function insert($sql, $params = []) {
        $this->query($sql, $params);
        return $this->conn->lastInsertId();
    }
    
    /**
     * Commence une transaction
     */
    public function beginTransaction() {
        return $this->conn->beginTransaction();
    }
    
    /**
     * Valide une transaction
     */
    public function commit() {
        return $this->conn->commit();
    }
    
    /**
     * Annule une transaction
     */
    public function rollback() {
        return $this->conn->rollBack();
    }
}