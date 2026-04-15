<?php
// c:\xampp\htdocs\anti\api\config.php

$host = "127.0.0.1";
$username = "root";
$password = "";
$db_name = "agriculture_portal";

try {
    // Connect without DB name first to create it if it doesn't exist
    $conn_init = new PDO("mysql:host=" . $host, $username, $password);
    $conn_init->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create DB
    $conn_init->exec("CREATE DATABASE IF NOT EXISTS " . $db_name);
    
    // Reconnect with DB Name
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    // Execute Schema to create tables
    $check_table = $conn->query("SHOW TABLES LIKE 'users'");
    if ($check_table->rowCount() == 0) {
        $schema_path = __DIR__ . '/../database/schema.sql';
        if (file_exists($schema_path)) {
            $sql = file_get_contents($schema_path);
            if ($sql) {
                $conn->exec($sql);
            }
        }
    }

} catch(PDOException $exception) {
    echo json_encode(["status" => "error", "message" => "Connection & Initialization error: " . $exception->getMessage()]);
    exit();
}
?>
