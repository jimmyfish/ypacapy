-- ypacapy dummy data: MySQL 8.0+ and MariaDB 10.6+
--
--   mysql -u root -p < dev/seed/mysql.sql
--
-- Safe to re-run: it drops and rebuilds the databases capy_sanctuary, capy_shop and capy_lab.
-- Nothing outside those three databases is touched.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS capy_sanctuary;
DROP DATABASE IF EXISTS capy_shop;
DROP DATABASE IF EXISTS capy_lab;
CREATE DATABASE capy_sanctuary DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE capy_shop      DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE capy_lab       DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Numbers 1..20000 for generating rows (works on MySQL and MariaDB alike).
CREATE TEMPORARY TABLE capy_lab.seq_n (i INT PRIMARY KEY);
INSERT INTO capy_lab.seq_n (i)
SELECT 1 + a.d + b.d * 10 + c.d * 100 + d.d * 1000 + e.d * 10000
FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d
CROSS JOIN (SELECT 0 d UNION ALL SELECT 1) e;

-- ─────────────────────────────── capy_sanctuary ───────────────────────────────

USE capy_sanctuary;

CREATE TABLE habitats (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(50) NOT NULL UNIQUE,
  biome      ENUM('wetland', 'river', 'savanna', 'forest') NOT NULL,
  area_m2    DECIMAL(10, 2) NOT NULL,
  has_pool   BOOLEAN NOT NULL DEFAULT FALSE,
  opened_on  DATE NOT NULL
) COMMENT = 'Where the capybaras live';

INSERT INTO habitats (name, biome, area_m2, has_pool, opened_on) VALUES
  ('Mud Spa',     'wetland', 1250.50, TRUE,  '2019-03-14'),
  ('Lazy River',  'river',   3400.00, TRUE,  '2019-06-01'),
  ('Grass Flats', 'savanna', 5200.75, FALSE, '2020-01-20'),
  ('Shady Grove', 'forest',  2100.00, FALSE, '2021-09-09'),
  ('Hot Springs', 'wetland',  800.25, TRUE,  '2023-12-24');

CREATE TABLE keepers (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  full_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE,
  hired_at     DATETIME NOT NULL,
  is_active    BOOLEAN NOT NULL,
  shift_start  TIME,
  notes        TEXT
);

INSERT INTO keepers (full_name, email, hired_at, is_active, shift_start, notes) VALUES
  ('Ana Souza',      'ana@capy.test',    '2019-02-01 08:00:00', TRUE,  '06:30', NULL),
  ('Budi Santoso',   'budi@capy.test',   '2019-05-12 09:00:00', TRUE,  '07:00', 'Knows every capy by its squeak'),
  ('Chen Wei',       NULL,               '2020-07-30 10:15:00', FALSE, NULL,    'Left in 2022, may come back'),
  ('Dewi Lestari',   'dewi@capy.test',   '2021-01-04 07:45:00', TRUE,  '14:00', ''),
  ('Emeka Obi',      'emeka@capy.test',  '2021-11-11 11:11:00', TRUE,  '22:00', 'Night shift'),
  ('Fatima Zahra',   'fatima@capy.test', '2022-03-08 08:30:00', FALSE, '06:30', NULL),
  ('Gustavo Lima',   'gus@capy.test',    '2023-06-19 06:00:00', TRUE,  '05:45', 'Brings oranges'),
  ('Hana Kobayashi', 'hana@capy.test',   '2024-09-02 09:30:00', TRUE,  '10:00', 'Line one\nLine two');

CREATE TABLE capybaras (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(50) NOT NULL,
  habitat_id     INT NOT NULL,
  mother_id      INT NULL,
  mood           ENUM('chill', 'sleepy', 'hungry', 'zoomies', 'grumpy') NOT NULL DEFAULT 'chill',
  weight_kg      DECIMAL(5, 1) NOT NULL,
  born_on        DATE NOT NULL,
  is_vaccinated  BOOLEAN NULL COMMENT 'NULL means nobody checked yet',
  tags           JSON NOT NULL,
  traits         JSON NOT NULL,
  chip_id        CHAR(36) NOT NULL DEFAULT (UUID()),
  photo          BLOB,
  UNIQUE KEY capybaras_chip_uk (chip_id),
  KEY capybaras_habitat_idx (habitat_id),
  CONSTRAINT capybaras_habitat_fk FOREIGN KEY (habitat_id) REFERENCES habitats (id),
  CONSTRAINT capybaras_mother_fk FOREIGN KEY (mother_id) REFERENCES capybaras (id) ON DELETE SET NULL
);

INSERT INTO capybaras (name, habitat_id, mother_id, mood, weight_kg, born_on, is_vaccinated, tags, traits, photo)
SELECT
  CONCAT(ELT(1 + (i - 1) % 12, 'Bean','Mochi','Pickle','Nugget','Tofu','Waffle','Biscuit','Pudding','Noodle','Dumpling','Churro','Maple'),
         IF(i > 12, CONCAT(' ', (i - 1) DIV 12 + 1), '')),
  1 + i % 5,
  IF(i > 10, 1 + (i * 7) % 10, NULL),
  ELT(1 + i % 5, 'chill','sleepy','hungry','zoomies','grumpy'),
  ROUND(35 + (i * 37 % 300) / 10.0, 1),
  DATE_ADD('2015-01-01', INTERVAL (i * 53 % 3000) DAY),
  CASE i % 3 WHEN 0 THEN FALSE WHEN 1 THEN TRUE END,
  CASE i % 4
    WHEN 0 THEN JSON_ARRAY('friendly')
    WHEN 1 THEN JSON_ARRAY('swimmer', 'napper')
    WHEN 2 THEN JSON_ARRAY()
    ELSE JSON_ARRAY('escape artist', 'orange thief', 'vocal')
  END,
  JSON_OBJECT(
    'fav_food',     ELT(1 + i % 5, 'grass','watermelon','corn','orange','hay'),
    'bath_minutes', i % 40,
    'likes_humans', JSON_EXTRACT(IF(i % 4 <> 0, 'true', 'false'), '$'),
    'best_friend',  IF(i % 6 = 0, NULL, CONCAT('duck #', i % 9)),
    'measurements', JSON_OBJECT('length_cm', 100 + i % 35, 'height_cm', 50 + i % 12)
  ),
  IF(i % 15 = 0, UNHEX('89504E470D0A1A0A'), NULL)
FROM capy_lab.seq_n WHERE i <= 60 ORDER BY i;

-- One-to-one with capybaras (ERD: 1 on capybaras, 0..1 on profiles).
CREATE TABLE capybara_profiles (
  capybara_id     INT PRIMARY KEY,
  bio             TEXT,
  instagram       VARCHAR(50) UNIQUE,
  favourite_spot  INT,
  CONSTRAINT profiles_capy_fk FOREIGN KEY (capybara_id) REFERENCES capybaras (id) ON DELETE CASCADE,
  CONSTRAINT profiles_spot_fk FOREIGN KEY (favourite_spot) REFERENCES habitats (id)
);

INSERT INTO capybara_profiles (capybara_id, bio, instagram, favourite_spot)
SELECT i,
  IF(i % 3 = 0, NULL, CONCAT('Professional napper #', i)),
  IF(i % 2 = 0, CONCAT('@capy_', i), NULL),
  IF(i % 4 = 0, NULL, 1 + i % 5)
FROM capy_lab.seq_n WHERE i <= 40;

CREATE TABLE capybara_keepers (
  capybara_id  INT,
  keeper_id    INT,
  role         VARCHAR(20) NOT NULL DEFAULT 'carer',
  since        DATE NOT NULL,
  PRIMARY KEY (capybara_id, keeper_id),
  CONSTRAINT ck_capy_fk FOREIGN KEY (capybara_id) REFERENCES capybaras (id) ON DELETE CASCADE,
  CONSTRAINT ck_keeper_fk FOREIGN KEY (keeper_id) REFERENCES keepers (id) ON DELETE CASCADE
);

INSERT IGNORE INTO capybara_keepers (capybara_id, keeper_id, role, since)
SELECT s.i, 1 + (s.i * k.m) % 8, IF(k.m = 1, 'lead', 'carer'), DATE_ADD('2020-01-01', INTERVAL s.i * 11 DAY)
FROM capy_lab.seq_n s CROSS JOIN (SELECT 1 m UNION ALL SELECT 2) k
WHERE s.i <= 60;

CREATE TABLE feedings (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  capybara_id  INT NOT NULL,
  keeper_id    INT NULL,
  fed_at       DATETIME NOT NULL,
  food         VARCHAR(20) NOT NULL,
  grams        INT NOT NULL CHECK (grams > 0),
  finished     BOOLEAN NOT NULL,
  note         VARCHAR(255),
  KEY feedings_capy_time_idx (capybara_id, fed_at),
  CONSTRAINT feedings_capy_fk FOREIGN KEY (capybara_id) REFERENCES capybaras (id) ON DELETE CASCADE,
  CONSTRAINT feedings_keeper_fk FOREIGN KEY (keeper_id) REFERENCES keepers (id) ON DELETE SET NULL
);

INSERT INTO feedings (capybara_id, keeper_id, fed_at, food, grams, finished, note)
SELECT
  1 + i % 60,
  IF(i % 97 = 0, NULL, 1 + i % 8),
  DATE_ADD('2024-12-31 23:00:00', INTERVAL i * 97 MINUTE),
  ELT(1 + i % 6, 'grass','hay','watermelon','corn','orange','pellets'),
  50 + (i * 13) % 900,
  i % 7 <> 0,
  IF(i % 50 = 0, 'Ate the bowl too', NULL)
FROM capy_lab.seq_n WHERE i <= 5000;

CREATE TABLE vet_visits (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  capybara_id   INT NOT NULL,
  visited_at    DATETIME NOT NULL,
  took          TIME NOT NULL,
  cost          DECIMAL(10, 2) NOT NULL,
  diagnosis     VARCHAR(100),
  follow_up     DATE,
  CONSTRAINT vet_capy_fk FOREIGN KEY (capybara_id) REFERENCES capybaras (id) ON DELETE CASCADE
);

INSERT INTO vet_visits (capybara_id, visited_at, took, cost, diagnosis, follow_up)
SELECT
  1 + (i * 3) % 60,
  DATE_ADD('2024-01-10 09:00:00', INTERVAL i * 123 HOUR),
  SEC_TO_TIME((15 + i % 90) * 60),
  75 + i * 12.5,
  ELT(1 + i % 5, 'Healthy', 'Overgrown teeth', 'Mild sunburn', NULL, 'Ate a sock'),
  IF(i % 4 = 0, DATE_ADD('2025-06-01', INTERVAL i DAY), NULL)
FROM capy_lab.seq_n WHERE i <= 80;

CREATE VIEW v_capybara_summary AS
SELECT
  c.id, c.name, h.name AS habitat, c.mood, c.weight_kg,
  m.name AS mother,
  COUNT(f.id) AS feedings,
  MAX(f.fed_at) AS last_fed
FROM capybaras c
JOIN habitats h ON h.id = c.habitat_id
LEFT JOIN capybaras m ON m.id = c.mother_id
LEFT JOIN feedings f ON f.capybara_id = c.id
GROUP BY c.id, c.name, h.name, c.mood, c.weight_kg, m.name;

DELIMITER //
CREATE FUNCTION capy_age(born DATE) RETURNS INT
DETERMINISTIC NO SQL
BEGIN
  RETURN TIMESTAMPDIFF(YEAR, born, CURDATE());
END //
DELIMITER ;

-- ───────────────────────────────── capy_shop ──────────────────────────────────

USE capy_shop;

CREATE TABLE customers (
  id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email       VARCHAR(100) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  country     CHAR(2) NOT NULL,
  marketing   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO customers (id, email, name, country, marketing, created_at)
SELECT
  CONCAT('c0000000-0000-4000-8000-', LPAD(i, 12, '0')),
  CONCAT('fan', i, '@example.test'),
  CONCAT(ELT(1 + i % 10, 'Rina','Tom','Aiko','Luis','Mei','Omar','Sara','Ivan','Nadia','Kofi'), ' ',
         ELT(1 + (i DIV 10) % 10, 'Putri','Smith','Tanaka','Garcia','Lin','Haddad','Berg','Petrov','Rahman','Mensah')),
  ELT(1 + i % 8, 'ID','US','JP','BR','SG','DE','NG','AU'),
  i % 3 = 0,
  DATE_ADD('2024-01-01 00:00:00', INTERVAL i * 17 HOUR)
FROM capy_lab.seq_n WHERE i <= 150;

CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sku         VARCHAR(20) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  price       DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock       INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  dimensions  JSON,
  tags        SET('plush', 'kids', 'kitchen', 'apparel', 'clearance', 'digital')
);

INSERT INTO products (sku, name, price, stock, active, dimensions, tags) VALUES
  ('PLU-001', 'Capy plush, small',       12.99,  140, TRUE,  '{"w":15,"h":12,"d":20,"unit":"cm"}',  'plush,kids'),
  ('PLU-002', 'Capy plush, huge',        59.00,    8, TRUE,  '{"w":60,"h":45,"d":80,"unit":"cm"}',  'plush'),
  ('MUG-001', 'Mug "Ok I pull up"',       9.50,   55, TRUE,  '{"w":8,"h":10,"d":8,"unit":"cm"}',    'kitchen'),
  ('TEE-001', 'T-shirt, capy in onsen',  19.99,    0, TRUE,  NULL,                                  'apparel'),
  ('TEE-002', 'T-shirt, retired design', 14.99,   12, FALSE, NULL,                                  'apparel,clearance'),
  ('STK-001', 'Sticker pack',             3.25, 1200, TRUE,  '{"w":10,"h":15,"d":0.1,"unit":"cm"}', ''),
  ('BOK-001', 'Book: A Year of Naps',    24.00,   30, TRUE,  '{"pages":212}',                       NULL),
  ('GFT-000', 'Gift card',                0.00, 9999, TRUE,  NULL,                                  'digital');

CREATE TABLE orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  CHAR(36) NOT NULL,
  status       ENUM('cart', 'paid', 'shipped', 'delivered', 'refunded') NOT NULL DEFAULT 'cart',
  placed_at    DATETIME NOT NULL,
  shipped_at   DATETIME NULL,
  address      JSON,
  KEY orders_customer_idx (customer_id),
  CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id)
);

INSERT INTO orders (customer_id, status, placed_at, shipped_at, address)
SELECT
  CONCAT('c0000000-0000-4000-8000-', LPAD(1 + (i * 7) % 150, 12, '0')),
  ELT(1 + i % 5, 'cart','paid','shipped','delivered','refunded'),
  DATE_ADD('2025-02-01 03:00:00', INTERVAL i * 433 MINUTE),
  IF(i % 5 IN (2, 3), DATE_ADD('2025-02-03 03:00:00', INTERVAL i * 433 MINUTE), NULL),
  JSON_OBJECT('city', ELT(1 + i % 5, 'Jakarta','Austin','Osaka','Recife','Singapore'), 'zip', LPAD(i * 37 % 99999, 5, '0'))
FROM capy_lab.seq_n WHERE i <= 400;

CREATE TABLE order_items (
  order_id    INT,
  product_id  INT,
  qty         SMALLINT NOT NULL CHECK (qty > 0),
  unit_price  DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (order_id, product_id),
  CONSTRAINT items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT items_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
);

INSERT IGNORE INTO order_items (order_id, product_id, qty, unit_price)
SELECT s.i, p.id, 1 + (s.i * p.id) % 4, p.price
FROM capy_lab.seq_n s
JOIN (SELECT 1 j UNION ALL SELECT 2 UNION ALL SELECT 3) n ON n.j <= 1 + s.i % 3
JOIN products p ON p.id = 1 + (s.i * n.j) % 8
WHERE s.i <= 400;

-- Cross-database link (ERD draws capy_sanctuary.capybaras dashed when capy_shop is picked).
CREATE TABLE adoptions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  customer_id  CHAR(36) NOT NULL,
  capybara_id  INT NOT NULL,
  tier         ENUM('bronze', 'silver', 'gold') NOT NULL DEFAULT 'bronze',
  monthly      DECIMAL(8, 2) NOT NULL,
  since        DATE NOT NULL,
  UNIQUE KEY adoptions_pair_uk (customer_id, capybara_id),
  CONSTRAINT adoptions_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT adoptions_capy_fk FOREIGN KEY (capybara_id) REFERENCES capy_sanctuary.capybaras (id)
);

INSERT IGNORE INTO adoptions (customer_id, capybara_id, tier, monthly, since)
SELECT
  CONCAT('c0000000-0000-4000-8000-', LPAD(1 + (i * 13) % 150, 12, '0')),
  1 + (i * 11) % 60,
  ELT(1 + i % 3, 'bronze', 'silver', 'gold'),
  5 + (i % 3) * 10,
  DATE_ADD('2024-03-01', INTERVAL i * 3 DAY)
FROM capy_lab.seq_n WHERE i <= 90;

CREATE VIEW v_order_totals AS
SELECT o.id, o.status, c.email, SUM(i.qty * i.unit_price) AS total, COUNT(*) AS line_count
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items i ON i.order_id = o.id
GROUP BY o.id, o.status, c.email;

DELIMITER //
CREATE PROCEDURE refund_order(IN p_order INT)
MODIFIES SQL DATA
BEGIN
  UPDATE orders SET status = 'refunded' WHERE id = p_order;
END //
DELIMITER ;

-- ────────────────────────────────── capy_lab ──────────────────────────────────

USE capy_lab;

-- One column per common type. Row 1 is "normal", row 2 is falsy/zero/empty,
-- row 3 is all NULL, the rest are extremes.
CREATE TABLE type_zoo (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  label          VARCHAR(20),
  c_bool         BOOLEAN,
  c_bit1         BIT(1),
  c_bit8         BIT(8),
  c_tinyint      TINYINT,
  c_tinyint_u    TINYINT UNSIGNED,
  c_smallint     SMALLINT,
  c_mediumint    MEDIUMINT,
  c_int          INT,
  c_bigint       BIGINT,
  c_bigint_u     BIGINT UNSIGNED,
  c_float        FLOAT,
  c_double       DOUBLE,
  c_decimal      DECIMAL(30, 9),
  c_char         CHAR(5),
  c_varchar      VARCHAR(255),
  c_text         TEXT,
  c_longtext     LONGTEXT,
  c_binary       BINARY(4),
  c_varbinary    VARBINARY(64),
  c_blob         BLOB,
  c_date         DATE,
  c_time         TIME(6),
  c_datetime     DATETIME(6),
  c_timestamp    TIMESTAMP NULL,
  c_year         YEAR,
  c_enum         ENUM('chill', 'sleepy', 'hungry', 'zoomies', 'grumpy'),
  c_set          SET('a', 'b', 'c'),
  c_json         JSON,
  c_point        POINT
);

INSERT INTO type_zoo VALUES
  (NULL, 'normal', TRUE, b'1', b'10101010', 42, 200, 1234, 123456, 1234567, 9007199254740993, 18446744073709551615,
   3.14, 2.718281828459045, 12345.678900000,
   'abc', 'hello', 'Capybaras are the largest living rodents.', 'Longer text lives here.', UNHEX('DEADBEEF'), UNHEX('CAFEBABE'), UNHEX('89504E47'),
   '2024-02-29', '13:37:00.123456', '2024-02-29 13:37:00.654321', '2024-02-29 13:37:00', 2024, 'chill', 'a,c',
   '{"a":1,"b":[1,2,3]}', ST_GeomFromText('POINT(1.5 2.5)')),
  (NULL, 'falsy', FALSE, b'0', b'00000000', 0, 0, 0, 0, 0, 0, 0,
   0, -0.0, 0,
   '', '', '', '', UNHEX('00000000'), UNHEX(''), UNHEX(''),
   '1970-01-01', '00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01', 1901, 'grumpy', '',
   'null', ST_GeomFromText('POINT(0 0)')),
  (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL),
  (NULL, 'extreme', TRUE, b'1', b'11111111', 127, 255, 32767, 8388607, 2147483647, 9223372036854775807, 18446744073709551615,
   3.402823e38, 1.7976931348623157e308, 999999999999999999999.999999999,
   'ZZZZZ', REPEAT('x', 255), REPEAT('Long text so the cell has to truncate. ', 150), REPEAT('Very long text. ', 20000), UNHEX('FFFFFFFF'), UNHEX(REPEAT('FF', 64)), UNHEX(REPEAT('FF', 512)),
   '9999-12-31', '838:59:59.000000', '9999-12-31 23:59:59.999999', '2038-01-19 03:14:07', 2155, 'zoomies', 'a,b,c',
   '[{"x":null},{"y":[[]]},12345678901234567890]', ST_GeomFromText('POINT(-1e10 1e10)')),
  (NULL, 'negative', FALSE, b'0', b'00000001', -128, 1, -32768, -8388608, -2147483648, -9223372036854775808, 1,
   -3.402823e38, -1.7976931348623157e308, -0.000000001,
   'neg', '-', '-', '-', UNHEX('00'), UNHEX('00'), UNHEX('00'),
   '1000-01-01', '-838:59:59.000000', '1000-01-01 00:00:00.000000', '1970-01-01 00:00:01', 1901, 'sleepy', 'b',
   '[-1, -2]', ST_GeomFromText('POINT(-1 -1)')),
  (NULL, 'unicode', TRUE, b'1', b'01100110', 1, 1, 1, 1, 1, 1, 1,
   1, 1, 1,
   'ñü', 'émoji 🦫', 'Tab\there, newline\nhere, emoji 🦫🍊, RTL مرحبا, CJK カピバラ', 'カピバラ', UNHEX('F09FA6AB'), UNHEX('F09FA6AB'), UNHEX('F09FA6AB'),
   '2025-12-31', '12:00:00', '2025-12-31 23:59:59', '2025-12-31 23:59:59', 2025, 'hungry', 'c',
   '{"🦫":"カピバラ","quote":"he said \\"hi\\""}', ST_GeomFromText('POINT(3 4)'));

-- Zero dates: legal only with a relaxed sql_mode. Kept in their own table.
SET @old_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = '';
CREATE TABLE zero_dates (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  label  VARCHAR(20),
  d      DATE,
  dt     DATETIME,
  ts     TIMESTAMP NULL
);
INSERT INTO zero_dates (label, d, dt, ts) VALUES
  ('all zero',   '0000-00-00', '0000-00-00 00:00:00', '0000-00-00 00:00:00'),
  ('zero month', '2024-00-10', '2024-00-10 10:00:00', NULL),
  ('normal',     '2024-05-10', '2024-05-10 10:00:00', '2024-05-10 10:00:00');
SET SESSION sql_mode = @old_mode;

-- 20,000 rows: for paging, scrolling and big-result warnings.
CREATE TABLE events (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  happened_at DATETIME NOT NULL,
  kind        VARCHAR(20) NOT NULL,
  actor       VARCHAR(20),
  ok          BOOLEAN NOT NULL,
  latency_ms  INT,
  payload     JSON,
  KEY events_time_idx (happened_at),
  KEY events_kind_idx (kind)
);

INSERT INTO events (happened_at, kind, actor, ok, latency_ms, payload)
SELECT
  DATE_ADD('2025-06-01 00:00:00', INTERVAL i * 41 SECOND),
  ELT(1 + i % 8, 'login','logout','feed','bath','nap','escape','photo','purchase'),
  IF(i % 11 = 0, NULL, CONCAT('user_', i % 333)),
  i % 13 <> 0,
  IF(i % 17 = 0, NULL, (i * 31) % 2500),
  IF(i % 5 = 0, NULL, JSON_OBJECT('seq', i, 'tags', JSON_ARRAY(CONCAT('t', i % 4), CONCAT('t', i % 7))))
FROM seq_n;

-- 40 columns, to test horizontal scroll and column width.
CREATE TABLE wide_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  col_01 VARCHAR(20), col_02 VARCHAR(20), col_03 VARCHAR(20), col_04 VARCHAR(20), col_05 VARCHAR(20), col_06 VARCHAR(20), col_07 VARCHAR(20), col_08 VARCHAR(20), col_09 VARCHAR(20), col_10 VARCHAR(20),
  col_11 VARCHAR(20), col_12 VARCHAR(20), col_13 VARCHAR(20), col_14 VARCHAR(20), col_15 VARCHAR(20), col_16 VARCHAR(20), col_17 VARCHAR(20), col_18 VARCHAR(20), col_19 VARCHAR(20), col_20 VARCHAR(20),
  col_21 VARCHAR(20), col_22 VARCHAR(20), col_23 VARCHAR(20), col_24 VARCHAR(20), col_25 VARCHAR(20), col_26 VARCHAR(20), col_27 VARCHAR(20), col_28 VARCHAR(20), col_29 VARCHAR(20), col_30 VARCHAR(20),
  col_31 VARCHAR(20), col_32 VARCHAR(20), col_33 VARCHAR(20), col_34 VARCHAR(20), col_35 VARCHAR(20), col_36 VARCHAR(20), col_37 VARCHAR(20), col_38 VARCHAR(20), col_39 VARCHAR(20), col_40 VARCHAR(20)
);

INSERT INTO wide_table (
  col_01, col_02, col_03, col_04, col_05, col_06, col_07, col_08, col_09, col_10,
  col_11, col_12, col_13, col_14, col_15, col_16, col_17, col_18, col_19, col_20,
  col_21, col_22, col_23, col_24, col_25, col_26, col_27, col_28, col_29, col_30,
  col_31, col_32, col_33, col_34, col_35, col_36, col_37, col_38, col_39, col_40)
SELECT
  CONCAT('r',i,'c1'),  CONCAT('r',i,'c2'),  CONCAT('r',i,'c3'),  CONCAT('r',i,'c4'),  CONCAT('r',i,'c5'),  CONCAT('r',i,'c6'),  CONCAT('r',i,'c7'),  CONCAT('r',i,'c8'),  CONCAT('r',i,'c9'),  CONCAT('r',i,'c10'),
  CONCAT('r',i,'c11'), CONCAT('r',i,'c12'), CONCAT('r',i,'c13'), CONCAT('r',i,'c14'), CONCAT('r',i,'c15'), CONCAT('r',i,'c16'), CONCAT('r',i,'c17'), CONCAT('r',i,'c18'), CONCAT('r',i,'c19'), CONCAT('r',i,'c20'),
  CONCAT('r',i,'c21'), CONCAT('r',i,'c22'), CONCAT('r',i,'c23'), CONCAT('r',i,'c24'), CONCAT('r',i,'c25'), CONCAT('r',i,'c26'), CONCAT('r',i,'c27'), CONCAT('r',i,'c28'), CONCAT('r',i,'c29'), CONCAT('r',i,'c30'),
  CONCAT('r',i,'c31'), CONCAT('r',i,'c32'), CONCAT('r',i,'c33'), CONCAT('r',i,'c34'), CONCAT('r',i,'c35'), CONCAT('r',i,'c36'), CONCAT('r',i,'c37'), CONCAT('r',i,'c38'), CONCAT('r',i,'c39'), CONCAT('r',i,'c40')
FROM seq_n WHERE i <= 25;

-- No primary key: editing should be refused.
CREATE TABLE no_pk (
  name   VARCHAR(20),
  score  INT,
  seen   BOOLEAN
);
INSERT INTO no_pk VALUES ('dup', 1, TRUE), ('dup', 1, TRUE), ('solo', 2, FALSE), (NULL, NULL, NULL);

-- Names that need quoting.
CREATE TABLE `Mixed Case Table` (
  `ID`          INT AUTO_INCREMENT PRIMARY KEY,
  `select`      VARCHAR(50),
  `from`        INT,
  `has space`   BOOLEAN,
  `dash-name`   VARCHAR(20),
  `UPPER`       VARCHAR(20)
);
INSERT INTO `Mixed Case Table` (`select`, `from`, `has space`, `dash-name`, `UPPER`) VALUES
  ('reserved word', 1, TRUE, 'a-b', 'X'),
  ('another', 2, FALSE, NULL, 'Y');

-- Empty table: the grid's empty state.
CREATE TABLE empty_table (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  note  VARCHAR(100)
);

-- Throwaway rows for the write guard: DELETE, UPDATE without WHERE, REPLACE, TRUNCATE, DROP.
CREATE TABLE scratch (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  label  VARCHAR(50) NOT NULL,
  n      INT NOT NULL DEFAULT 0
);
INSERT INTO scratch (label, n) SELECT CONCAT('row ', i), i FROM seq_n WHERE i <= 250;

-- For the Columns view editor. The one ALTER must keep each column's charset,
-- AUTO_INCREMENT, ON UPDATE, INVISIBLE and COMMENT. full_label is generated (locked),
-- habitat_id carries a foreign key (cannot drop), maybe_null holds NULLs.
CREATE TABLE alter_me (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Row id',
  title        VARCHAR(50) NOT NULL DEFAULT 'untitled',
  status       ENUM('pending', 'done', 'failed') NOT NULL DEFAULT 'pending',
  legacy_name  VARCHAR(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL COMMENT 'Old latin1 column',
  token        CHAR(36) DEFAULT (UUID()),
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  secret_note  VARCHAR(100) DEFAULT 'hidden' INVISIBLE,
  maybe_null   INT,
  amount       DECIMAL(8, 2) DEFAULT 0.00,
  no_default   VARCHAR(20) NOT NULL,
  full_label   VARCHAR(120) GENERATED ALWAYS AS (CONCAT(title, ' [', status, ']')) VIRTUAL,
  indexed_col  VARCHAR(20),
  habitat_id   INT,
  KEY alter_me_indexed_idx (indexed_col),
  CONSTRAINT alter_me_habitat_fk FOREIGN KEY (habitat_id) REFERENCES capy_sanctuary.habitats (id)
);
INSERT INTO alter_me (title, status, legacy_name, maybe_null, amount, no_default, indexed_col, habitat_id)
SELECT CONCAT('Item ', i), ELT(1 + i % 3, 'pending', 'done', 'failed'), CONCAT('Ol', CHAR(233), ' ', i),
       IF(i % 4 = 0, NULL, i), i * 1.5, CONCAT('nd', i), CONCAT('k', i % 7), 1 + i % 5
FROM seq_n WHERE i <= 30;

-- Slow on purpose: Cancel, statement timeout and the Task manager.
--   SELECT capy_lab.nap(60);
DELIMITER //
CREATE FUNCTION nap(seconds INT) RETURNS VARCHAR(64)
NOT DETERMINISTIC NO SQL
BEGIN
  DO SLEEP(seconds);
  RETURN CONCAT('Capy woke up after ', seconds, ' s');
END //

CREATE PROCEDURE reset_scratch()
MODIFIES SQL DATA
BEGIN
  TRUNCATE TABLE scratch;
  INSERT INTO scratch (label, n) SELECT CONCAT('row ', i), i FROM (
    SELECT a.d + b.d * 10 + c.d * 100 + 1 AS i
    FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
    CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
    CROSS JOIN (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2) c
  ) n WHERE i <= 250;
END //
DELIMITER ;

DROP TEMPORARY TABLE seq_n;
SET FOREIGN_KEY_CHECKS = 1;

ANALYZE TABLE capy_sanctuary.capybaras, capy_sanctuary.feedings, capy_shop.orders, capy_shop.order_items, capy_lab.events;
