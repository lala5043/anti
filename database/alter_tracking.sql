USE agriculture_portal;

ALTER TABLE orders 
ADD COLUMN tracking_status ENUM('Placed', 'Processing', 'Shipped', 'Delivered') DEFAULT 'Placed' AFTER status,
ADD COLUMN tracking_number VARCHAR(100) NULL AFTER tracking_status,
ADD COLUMN shipping_address TEXT AFTER tracking_number;

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    farmer_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);
