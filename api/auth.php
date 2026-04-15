<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    if ($action === 'register') {
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $phone = $input['phone'] ?? '';
        $role = $input['role'] ?? 'buyer';
        
        if (empty($name) || empty($email) || empty($password)) {
            echo json_encode(['status' => 'error', 'message' => 'Please fill all required fields.']);
            exit;
        }
        
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Email already registered.']);
            exit;
        }
        
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (role, name, email, password_hash, phone) VALUES (?, ?, ?, ?, ?)");
        if ($stmt->execute([$role, $name, $email, $hashed, $phone])) {
            echo json_encode(['status' => 'success', 'message' => 'Registration successful']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to register']);
        }
    } 
    elseif ($action === 'login') {
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        
        $stmt = $conn->prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['name'] = $user['name'];
            
            unset($user['password_hash']);
            echo json_encode(['status' => 'success', 'message' => 'Login successful', 'user' => $user]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid email or password']);
        }
    }
    elseif ($action === 'logout') {
        session_destroy();
        echo json_encode(['status' => 'success', 'message' => 'Logged out successfully']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'session') {
        if (isset($_SESSION['user_id'])) {
            echo json_encode([
                'status' => 'success',
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'role' => $_SESSION['role'],
                    'name' => $_SESSION['name']
                ]
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
        }
    }
}
?>
