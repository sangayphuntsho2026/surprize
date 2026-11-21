CREATE DATABASE IF NOT EXISTS surprize_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE surprize_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  bio VARCHAR(255) NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gifts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  type VARCHAR(40) NOT NULL,
  description VARCHAR(220) NULL,
  price DECIMAL(10,2) NOT NULL,
  emoji VARCHAR(8) DEFAULT '🎁',
  image_url VARCHAR(500) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gifts_type_active (type, active)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id BIGINT UNSIGNED NOT NULL,
  gift_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, gift_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_gift FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(100) NOT NULL,
  occasion VARCHAR(40) NOT NULL,
  for_who VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NULL,
  budget DECIMAL(10,2) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(30) NOT NULL,
  recipient_address VARCHAR(255) NOT NULL,
  instructions VARCHAR(200) NULL,
  card_message VARCHAR(250) NULL,
  status ENUM('draft','ordered') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  gift_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_plan_items_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_items_gift FOREIGN KEY (gift_id) REFERENCES gifts(id),
  UNIQUE KEY uq_plan_gift (plan_id, gift_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NULL,
  title VARCHAR(100) NOT NULL,
  occasion VARCHAR(40) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(30) NOT NULL,
  recipient_address VARCHAR(255) NOT NULL,
  instructions VARCHAR(200) NULL,
  delivery_method ENUM('home','future') NOT NULL DEFAULT 'home',
  event_date DATE NOT NULL,
  event_time TIME NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('Pending','Packaging','Dispatched','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_orders_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL,
  INDEX idx_orders_user_created (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  gift_id BIGINT UNSIGNED NULL,
  gift_name VARCHAR(80) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  emoji VARCHAR(8) DEFAULT '🎁',
  quantity INT UNSIGNED NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_gift FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  method ENUM('bank_transfer','cod') NOT NULL,
  reference VARCHAR(100) NULL,
  status ENUM('Awaiting verification','Paid','Completed','Pay on delivery','Failed') NOT NULL,
  verified_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_admin FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, is_read, created_at)
);

-- Optional sample gift rows. Add your actual catalogue from your existing store.js.
INSERT INTO gifts (name,type,description,price,emoji)
SELECT * FROM (
  SELECT 'Birthday Cake','Birthday','A sweet cake for a birthday celebration',650,'🎂'
  UNION ALL SELECT 'Flower Bouquet','Flowers','Fresh flowers for someone special',450,'💐'
  UNION ALL SELECT 'Personalized Mug','Personalized','A mug with a personal touch',250,'☕'
  UNION ALL SELECT 'Photo Frame','Personalized','A frame for a favourite memory',350,'🖼️'
  UNION ALL SELECT 'Chocolate Box','Food','A box of assorted chocolates',300,'🍫'
  UNION ALL SELECT 'Greeting Card','Cards','A thoughtful handwritten message',100,'💌'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM gifts LIMIT 1);
