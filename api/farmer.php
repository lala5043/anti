<?php
session_start();
require_once 'config.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'farmer') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$farmer_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'dashboard') {
        $stmt = $conn->prepare("SELECT COUNT(id) as total_products, SUM(price * stock) as total_value FROM products WHERE farmer_id = ?");
        $stmt->execute([$farmer_id]);
        $stats = $stmt->fetch();
        
        echo json_encode(['status' => 'success', 'stats' => [
            'total_products' => $stats['total_products'] ?? 0,
            'total_value' => $stats['total_value'] ?? 0,
            'earnings' => 0 
        ]]);
    }
    elseif ($action === 'get_products') {
        $stmt = $conn->prepare("SELECT * FROM products WHERE farmer_id = ? ORDER BY created_at DESC");
        $stmt->execute([$farmer_id]);
        echo json_encode(['status' => 'success', 'products' => $stmt->fetchAll()]);
    }
    elseif ($action === 'get_profile') {
        $stmt = $conn->prepare("SELECT name, email, phone, profile_pic FROM users WHERE id = ?");
        $stmt->execute([$farmer_id]);
        echo json_encode(['status' => 'success', 'profile' => $stmt->fetch()]);
    }
    elseif ($action === 'get_orders') {
        $stmt = $conn->prepare("
            SELECT DISTINCT o.*, u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN users u ON o.buyer_id = u.id
            WHERE oi.farmer_id = ?
            ORDER BY o.created_at DESC
        ");
        $stmt->execute([$farmer_id]);
        $orders = $stmt->fetchAll();
        
        foreach ($orders as &$order) {
            $stmt_items = $conn->prepare("
                SELECT oi.quantity, oi.price, p.name, p.unit_type
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ? AND oi.farmer_id = ?
            ");
            $stmt_items->execute([$order['id'], $farmer_id]);
            $order['items'] = $stmt_items->fetchAll();
        }
        
        echo json_encode(['status' => 'success', 'orders' => $orders]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    if ($action === 'add_product') {
        $name = $input['name'];
        $desc = $input['description'];
        $price = $input['price'];
        $cat = $input['category'];
        $stock = $input['stock'];
        $unit_type = $input['unit_type'] ?? 'Kg';
        $moq = $input['moq'] ?? 1;
        $harvest_date = $input['harvest_date'] ?? null;
        if ($harvest_date === '') $harvest_date = null;
        
        $img = '';
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $filename = uniqid('prod_') . '_' . basename($_FILES['image']['name']);
            if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $filename)) {
                $img = 'uploads/' . $filename;
            }
        }
        
        $stmt = $conn->prepare("INSERT INTO products (farmer_id, name, description, price, unit_type, moq, harvest_date, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmt->execute([$farmer_id, $name, $desc, $price, $unit_type, $moq, $harvest_date, $cat, $stock, $img])) {
            echo json_encode(['status' => 'success', 'message' => 'Product added successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to add product']);
        }
    }
    elseif ($action === 'update_product') {
        $id = $input['id'];
        $name = $input['name'];
        $desc = $input['description'];
        $price = $input['price'];
        $cat = $input['category'];
        $stock = $input['stock'];
        $unit_type = $input['unit_type'] ?? 'Kg';
        $moq = $input['moq'] ?? 1;
        $harvest_date = $input['harvest_date'] ?? null;
        if ($harvest_date === '') $harvest_date = null;
        
        $img = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $filename = uniqid('prod_') . '_' . basename($_FILES['image']['name']);
            if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $filename)) {
                $img = 'uploads/' . $filename;
            }
        }
        
        if ($img !== null) {
            $stmt = $conn->prepare("UPDATE products SET name=?, description=?, price=?, unit_type=?, moq=?, harvest_date=?, category=?, stock=?, image_url=? WHERE id=? AND farmer_id=?");
            $success = $stmt->execute([$name, $desc, $price, $unit_type, $moq, $harvest_date, $cat, $stock, $img, $id, $farmer_id]);
        } else {
            $stmt = $conn->prepare("UPDATE products SET name=?, description=?, price=?, unit_type=?, moq=?, harvest_date=?, category=?, stock=? WHERE id=? AND farmer_id=?");
            $success = $stmt->execute([$name, $desc, $price, $unit_type, $moq, $harvest_date, $cat, $stock, $id, $farmer_id]);
        }
        
        if ($success) {
            echo json_encode(['status' => 'success', 'message' => 'Product updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update product']);
        }
    }
    elseif ($action === 'delete_product') {
        $id = $input['id'];
        $stmt = $conn->prepare("DELETE FROM products WHERE id=? AND farmer_id=?");
        if ($stmt->execute([$id, $farmer_id])) {
            echo json_encode(['status' => 'success', 'message' => 'Product deleted successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete product']);
        }
    }
    elseif ($action === 'update_profile') {
        $name = $_POST['name'] ?? $input['name'];
        $phone = $_POST['phone'] ?? $input['phone'];
        
        $img = null;
        if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $filename = uniqid('prof_') . '_' . basename($_FILES['profile_pic']['name']);
            if (move_uploaded_file($_FILES['profile_pic']['tmp_name'], $uploadDir . $filename)) {
                $img = 'uploads/' . $filename;
            }
        }
        
        if ($img !== null) {
            $stmt = $conn->prepare("UPDATE users SET name=?, phone=?, profile_pic=? WHERE id=?");
            $success = $stmt->execute([$name, $phone, $img, $farmer_id]);
        } else {
            $stmt = $conn->prepare("UPDATE users SET name=?, phone=? WHERE id=?");
            $success = $stmt->execute([$name, $phone, $farmer_id]);
        }
        
        if ($success) {
            $_SESSION['name'] = $name;
            echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update profile']);
        }
    }
    elseif ($action === 'update_order_status') {
        $order_id = $input['order_id'];
        $status = $input['status'];
        
        $stmt_check = $conn->prepare("SELECT id FROM order_items WHERE order_id = ? AND farmer_id = ? LIMIT 1");
        $stmt_check->execute([$order_id, $farmer_id]);
        if (!$stmt_check->fetch()) {
             echo json_encode(['status' => 'error', 'message' => 'Unauthorized or invalid order']);
             exit;
        }

        $stmt = $conn->prepare("UPDATE orders SET tracking_status = ? WHERE id = ?");
        if ($stmt->execute([$status, $order_id])) {
            echo json_encode(['status' => 'success', 'message' => 'Order status updated']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update order status']);
        }
    }
}
?>
