<?php
session_start();
require_once 'config.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$buyer_id = $_SESSION['user_id'] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'explore') {
        $search = $_GET['q'] ?? '';
        $category = $_GET['category'] ?? '';
        $sort = $_GET['sort'] ?? 'newest';
        
        $query = "SELECT p.*, u.name as farmer_name FROM products p JOIN users u ON p.farmer_id = u.id WHERE p.stock > 0";
        $params = [];
        
        if (!empty($search)) {
            $query .= " AND (p.name LIKE ? OR p.description LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        if (!empty($category)) {
            $query .= " AND p.category = ?";
            $params[] = $category;
        }
        
        if ($sort === 'price_asc') {
            $query .= " ORDER BY p.price ASC";
        } elseif ($sort === 'price_desc') {
            $query .= " ORDER BY p.price DESC";
        } else {
            $query .= " ORDER BY p.created_at DESC";
        }
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        echo json_encode(['status' => 'success', 'products' => $stmt->fetchAll()]);
    }
    elseif ($action === 'get_cart') {
        if (!$buyer_id) { echo json_encode(['status'=>'error', 'message'=>'Unauthorized']); exit; }
        
        $stmt = $conn->prepare("
            SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.unit_type, p.image_url, p.stock, u.name as farmer_name 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            JOIN users u ON p.farmer_id = u.id
            WHERE c.buyer_id = ?
        ");
        $stmt->execute([$buyer_id]);
        $items = $stmt->fetchAll();
        
        $total = 0;
        foreach($items as $item) { $total += ($item['price'] * $item['quantity']); }
        
        echo json_encode(['status' => 'success', 'items' => $items, 'total' => $total]);
    }
    elseif ($action === 'get_orders') {
        if (!$buyer_id) { echo json_encode(['status'=>'error', 'message'=>'Unauthorized']); exit; }
        $stmt = $conn->prepare("SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC");
        $stmt->execute([$buyer_id]);
        $orders = $stmt->fetchAll();
        
        foreach ($orders as &$order) {
            $stmt_items = $conn->prepare("
                SELECT oi.quantity, oi.price, p.name, p.image_url, p.unit_type, u.name as farmer_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN users u ON oi.farmer_id = u.id
                WHERE oi.order_id = ?
            ");
            $stmt_items->execute([$order['id']]);
            $order['items'] = $stmt_items->fetchAll();
        }
        
        echo json_encode(['status' => 'success', 'orders' => $orders]);
    }
    elseif ($action === 'get_profile') {
        if (!$buyer_id) { echo json_encode(['status'=>'error', 'message'=>'Unauthorized']); exit; }
        $stmt = $conn->prepare("SELECT name, email, phone, profile_pic FROM users WHERE id = ?");
        $stmt->execute([$buyer_id]);
        echo json_encode(['status' => 'success', 'profile' => $stmt->fetch()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$buyer_id) { echo json_encode(['status'=>'error', 'message'=>'Unauthorized']); exit; }
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    if ($action === 'add_to_cart') {
        $product_id = $input['product_id'];
        $qty = $input['quantity'] ?? 1;
        
        $stmt = $conn->prepare("SELECT id, quantity FROM cart WHERE buyer_id = ? AND product_id = ?");
        $stmt->execute([$buyer_id, $product_id]);
        $existing = $stmt->fetch();
        
        $stmt_stock = $conn->prepare("SELECT stock FROM products WHERE id = ?");
        $stmt_stock->execute([$product_id]);
        $prod = $stmt_stock->fetch();
        
        $new_qty = $existing ? $existing['quantity'] + $qty : $qty;
        if (!$prod || $prod['stock'] < $new_qty) {
            echo json_encode(['status' => 'error', 'message' => 'Not enough stock available.']);
            exit;
        }

        if ($existing) {
            $stmt = $conn->prepare("UPDATE cart SET quantity = quantity + ? WHERE id = ?");
            if ($stmt->execute([$qty, $existing['id']])) {
                echo json_encode(['status' => 'success', 'message' => 'Cart updated!']);
            }
        } else {
            $stmt = $conn->prepare("INSERT INTO cart (buyer_id, product_id, quantity) VALUES (?, ?, ?)");
            if ($stmt->execute([$buyer_id, $product_id, $qty])) {
                echo json_encode(['status' => 'success', 'message' => 'Added to cart!']);
            }
        }
    }
    elseif ($action === 'update_cart') {
        $cart_id = $input['cart_id'];
        $qty = $input['quantity'];
        
        if ($qty <= 0) {
            $stmt = $conn->prepare("DELETE FROM cart WHERE id = ? AND buyer_id = ?");
            $stmt->execute([$cart_id, $buyer_id]);
            echo json_encode(['status' => 'success', 'message' => 'Removed package from cart.']);
        } else {
            $stmt_stock = $conn->prepare("SELECT p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.id = ?");
            $stmt_stock->execute([$cart_id]);
            $prod = $stmt_stock->fetch();
            if (!$prod || $prod['stock'] < $qty) {
                echo json_encode(['status' => 'error', 'message' => 'Not enough stock available.']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE id = ? AND buyer_id = ?");
            $stmt->execute([$qty, $cart_id, $buyer_id]);
            echo json_encode(['status' => 'success', 'message' => 'Cart updated.']);
        }
    }
    elseif ($action === 'checkout') {
        $address = $input['shipping_address'] ?? 'Default Address'; 
        
        $stmt = $conn->prepare("SELECT c.quantity, p.id, p.price, p.farmer_id, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.buyer_id = ?");
        $stmt->execute([$buyer_id]);
        $items = $stmt->fetchAll();
        
        $total = 0;
        foreach($items as $item) { 
            if ($item['stock'] < $item['quantity']) {
                echo json_encode(['status' => 'error', 'message' => "Insufficient stock for product."]);
                exit;
            }
            $total += $item['price'] * $item['quantity']; 
        }
        
        if ($total > 0) {
            $conn->beginTransaction();
            try {
                $stmt = $conn->prepare("INSERT INTO orders (buyer_id, total, status, shipping_address) VALUES (?, ?, 'completed', ?)");
                $stmt->execute([$buyer_id, $total, $address]);
                $order_id = $conn->lastInsertId();
                
                $stmt_insert = $conn->prepare("INSERT INTO order_items (order_id, product_id, farmer_id, quantity, price) VALUES (?, ?, ?, ?, ?)");
                $stmt_stock = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
                foreach($items as $item) {
                    $stmt_insert->execute([$order_id, $item['id'], $item['farmer_id'], $item['quantity'], $item['price']]);
                    $stmt_stock->execute([$item['quantity'], $item['id']]);
                }

                $stmt = $conn->prepare("DELETE FROM cart WHERE buyer_id = ?");
                $stmt->execute([$buyer_id]);
                
                $conn->commit();
                echo json_encode(['status' => 'success', 'message' => 'Order placed successfully!', 'order_id' => $order_id]);
            } catch (Exception $e) {
                $conn->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Failed to place order.']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Cart is empty.']);
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
            $success = $stmt->execute([$name, $phone, $img, $buyer_id]);
        } else {
            $stmt = $conn->prepare("UPDATE users SET name=?, phone=? WHERE id=?");
            $success = $stmt->execute([$name, $phone, $buyer_id]);
        }
        
        if ($success) {
            $_SESSION['name'] = $name;
            echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update profile']);
        }
    }
}
?>
