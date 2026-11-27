-- ypacapy dummy data: SQLite 3.37+
--
--   sqlite3 capy.sqlite < dev/seed/sqlite.sql
--
-- Safe to re-run on the same file: it drops and rebuilds every table below.
-- SQLite has no schemas, so the Postgres sanctuary/shop/lab split becomes name prefixes.

PRAGMA foreign_keys = OFF;
BEGIN;

DROP VIEW IF EXISTS v_capybara_summary;
DROP VIEW IF EXISTS shop_v_order_totals;
DROP TABLE IF EXISTS feedings;
DROP TABLE IF EXISTS vet_visits;
DROP TABLE IF EXISTS capybara_keepers;
DROP TABLE IF EXISTS capybara_profiles;
DROP TABLE IF EXISTS lab_scratch;
DROP TABLE IF EXISTS lab_alter_me;
DROP TABLE IF EXISTS capybaras;
DROP TABLE IF EXISTS keepers;
DROP TABLE IF EXISTS habitats;
DROP TABLE IF EXISTS shop_order_items;
DROP TABLE IF EXISTS shop_orders;
DROP TABLE IF EXISTS shop_products;
DROP TABLE IF EXISTS shop_customers;
DROP TABLE IF EXISTS lab_type_zoo;
DROP TABLE IF EXISTS lab_strict_types;
DROP TABLE IF EXISTS lab_events;
DROP TABLE IF EXISTS lab_wide_table;
DROP TABLE IF EXISTS lab_no_pk;
DROP TABLE IF EXISTS "lab Mixed Case";
DROP TABLE IF EXISTS lab_empty_table;

-- ─────────────────────────────── sanctuary ───────────────────────────────

CREATE TABLE habitats (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  biome      TEXT NOT NULL CHECK (biome IN ('wetland', 'river', 'savanna', 'forest')),
  area_m2    REAL NOT NULL,
  has_pool   BOOLEAN NOT NULL DEFAULT 0,
  opened_on  DATE NOT NULL
);

INSERT INTO habitats (name, biome, area_m2, has_pool, opened_on) VALUES
  ('Mud Spa',     'wetland', 1250.50, 1, '2019-03-14'),
  ('Lazy River',  'river',   3400.00, 1, '2019-06-01'),
  ('Grass Flats', 'savanna', 5200.75, 0, '2020-01-20'),
  ('Shady Grove', 'forest',  2100.00, 0, '2021-09-09'),
  ('Hot Springs', 'wetland',  800.25, 1, '2023-12-24');

CREATE TABLE keepers (
  id           INTEGER PRIMARY KEY,
  full_name    TEXT NOT NULL,
  email        TEXT UNIQUE,
  hired_at     DATETIME NOT NULL,
  is_active    BOOLEAN NOT NULL,
  shift_start  TIME,
  notes        TEXT
);

INSERT INTO keepers (full_name, email, hired_at, is_active, shift_start, notes) VALUES
  ('Ana Souza',      'ana@capy.test',    '2019-02-01 08:00:00', 1, '06:30', NULL),
  ('Budi Santoso',   'budi@capy.test',   '2019-05-12 09:00:00', 1, '07:00', 'Knows every capy by its squeak'),
  ('Chen Wei',       NULL,               '2020-07-30 10:15:00', 0, NULL,    'Left in 2022, may come back'),
  ('Dewi Lestari',   'dewi@capy.test',   '2021-01-04 07:45:00', 1, '14:00', ''),
  ('Emeka Obi',      'emeka@capy.test',  '2021-11-11 11:11:00', 1, '22:00', 'Night shift'),
  ('Fatima Zahra',   'fatima@capy.test', '2022-03-08 08:30:00', 0, '06:30', NULL),
  ('Gustavo Lima',   'gus@capy.test',    '2023-06-19 06:00:00', 1, '05:45', 'Brings oranges'),
  ('Hana Kobayashi', 'hana@capy.test',   '2024-09-02 09:30:00', 1, '10:00', 'Line one' || char(10) || 'Line two');

CREATE TABLE capybaras (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  habitat_id     INTEGER NOT NULL REFERENCES habitats (id),
  mother_id      INTEGER REFERENCES capybaras (id) ON DELETE SET NULL,
  mood           TEXT NOT NULL DEFAULT 'chill' CHECK (mood IN ('chill', 'sleepy', 'hungry', 'zoomies', 'grumpy')),
  weight_kg      NUMERIC NOT NULL,
  born_on        DATE NOT NULL,
  is_vaccinated  BOOLEAN,
  tags           JSON NOT NULL DEFAULT '[]',
  traits         JSON NOT NULL DEFAULT '{}',
  chip_id        TEXT NOT NULL UNIQUE,
  photo          BLOB
);
CREATE INDEX capybaras_habitat_idx ON capybaras (habitat_id);

WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 60)
INSERT INTO capybaras (name, habitat_id, mother_id, mood, weight_kg, born_on, is_vaccinated, tags, traits, chip_id, photo)
SELECT
  json_extract('["Bean","Mochi","Pickle","Nugget","Tofu","Waffle","Biscuit","Pudding","Noodle","Dumpling","Churro","Maple"]', '$[' || ((i - 1) % 12) || ']')
    || CASE WHEN i > 12 THEN ' ' || ((i - 1) / 12 + 1) ELSE '' END,
  1 + i % 5,
  CASE WHEN i > 10 THEN 1 + (i * 7) % 10 END,
  json_extract('["chill","sleepy","hungry","zoomies","grumpy"]', '$[' || (i % 5) || ']'),
  round(35 + (i * 37 % 300) / 10.0, 1),
  date('2015-01-01', '+' || (i * 53 % 3000) || ' days'),
  CASE i % 3 WHEN 0 THEN 0 WHEN 1 THEN 1 END,
  CASE i % 4
    WHEN 0 THEN '["friendly"]'
    WHEN 1 THEN '["swimmer","napper"]'
    WHEN 2 THEN '[]'
    ELSE '["escape artist","orange thief","vocal"]'
  END,
  json_object(
    'fav_food',     json_extract('["grass","watermelon","corn","orange","hay"]', '$[' || (i % 5) || ']'),
    'bath_minutes', i % 40,
    'likes_humans', json(CASE WHEN i % 4 <> 0 THEN 'true' ELSE 'false' END),
    'best_friend',  CASE WHEN i % 6 = 0 THEN NULL ELSE 'duck #' || (i % 9) END,
    'measurements', json_object('length_cm', 100 + i % 35, 'height_cm', 50 + i % 12)
  ),
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  CASE WHEN i % 15 = 0 THEN x'89504e470d0a1a0a' END
FROM seq;

-- One-to-one with capybaras (ERD: 1 on capybaras, 0..1 on profiles).
CREATE TABLE capybara_profiles (
  capybara_id     INTEGER PRIMARY KEY REFERENCES capybaras (id) ON DELETE CASCADE,
  bio             TEXT,
  instagram       TEXT UNIQUE,
  favourite_spot  INTEGER REFERENCES habitats (id)
);

WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 40)
INSERT INTO capybara_profiles (capybara_id, bio, instagram, favourite_spot)
SELECT i,
  CASE WHEN i % 3 = 0 THEN NULL ELSE 'Professional napper #' || i END,
  CASE WHEN i % 2 = 0 THEN '@capy_' || i END,
  CASE WHEN i % 4 = 0 THEN NULL ELSE 1 + i % 5 END
FROM seq;

CREATE TABLE capybara_keepers (
  capybara_id  INTEGER REFERENCES capybaras (id) ON DELETE CASCADE,
  keeper_id    INTEGER REFERENCES keepers (id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'carer',
  since        DATE NOT NULL,
  PRIMARY KEY (capybara_id, keeper_id)
) WITHOUT ROWID;

WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c WHERE n < 60),
               k(m) AS (SELECT 1 UNION ALL SELECT 2)
INSERT OR IGNORE INTO capybara_keepers (capybara_id, keeper_id, role, since)
SELECT n, 1 + (n * m) % 8, CASE WHEN m = 1 THEN 'lead' ELSE 'carer' END, date('2020-01-01', '+' || (n * 11) || ' days')
FROM c, k;

CREATE TABLE feedings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  capybara_id  INTEGER NOT NULL REFERENCES capybaras (id) ON DELETE CASCADE,
  keeper_id    INTEGER REFERENCES keepers (id) ON DELETE SET NULL,
  fed_at       DATETIME NOT NULL,
  food         TEXT NOT NULL,
  grams        INTEGER NOT NULL CHECK (grams > 0),
  finished     BOOLEAN NOT NULL,
  note         TEXT
);
CREATE INDEX feedings_capy_time_idx ON feedings (capybara_id, fed_at DESC);

WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 5000)
INSERT INTO feedings (capybara_id, keeper_id, fed_at, food, grams, finished, note)
SELECT
  1 + i % 60,
  CASE WHEN i % 97 = 0 THEN NULL ELSE 1 + i % 8 END,
  datetime('2024-12-31 23:00:00', '+' || (i * 97) || ' minutes'),
  json_extract('["grass","hay","watermelon","corn","orange","pellets"]', '$[' || (i % 6) || ']'),
  50 + (i * 13) % 900,
  i % 7 <> 0,
  CASE WHEN i % 50 = 0 THEN 'Ate the bowl too' END
FROM seq;

CREATE TABLE vet_visits (
  id            INTEGER PRIMARY KEY,
  capybara_id   INTEGER NOT NULL REFERENCES capybaras (id) ON DELETE CASCADE,
  visited_at    DATETIME NOT NULL,
  took_minutes  INTEGER NOT NULL,
  cost          DECIMAL(10, 2) NOT NULL,
  diagnosis     TEXT,
  follow_up     DATE
);

WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 80)
INSERT INTO vet_visits (capybara_id, visited_at, took_minutes, cost, diagnosis, follow_up)
SELECT
  1 + (i * 3) % 60,
  datetime('2024-01-10 09:00:00', '+' || (i * 123) || ' hours'),
  15 + i % 90,
  75 + i * 12.5,
  json_extract('["Healthy","Overgrown teeth","Mild sunburn",null,"Ate a sock"]', '$[' || (i % 5) || ']'),
  CASE WHEN i % 4 = 0 THEN date('2025-06-01', '+' || i || ' days') END
FROM seq;

CREATE VIEW v_capybara_summary AS
SELECT
  c.id, c.name, h.name AS habitat, c.mood, c.weight_kg,
  m.name AS mother,
  count(f.id) AS feedings,
  max(f.fed_at) AS last_fed
FROM capybaras c
JOIN habitats h ON h.id = c.habitat_id
LEFT JOIN capybaras m ON m.id = c.mother_id
LEFT JOIN feedings f ON f.capybara_id = c.id
GROUP BY c.id;

-- ───────────────────────────────── shop ──────────────────────────────────

CREATE TABLE shop_customers (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  country     TEXT NOT NULL CHECK (length(country) = 2),
  marketing   BOOLEAN NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 150)
INSERT INTO shop_customers (id, email, name, country, marketing, created_at)
SELECT
  printf('c0000000-0000-4000-8000-%012d', i),
  'fan' || i || '@example.test',
  json_extract('["Rina","Tom","Aiko","Luis","Mei","Omar","Sara","Ivan","Nadia","Kofi"]', '$[' || (i % 10) || ']') || ' ' ||
  json_extract('["Putri","Smith","Tanaka","Garcia","Lin","Haddad","Berg","Petrov","Rahman","Mensah"]', '$[' || ((i / 10) % 10) || ']'),
  json_extract('["ID","US","JP","BR","SG","DE","NG","AU"]', '$[' || (i % 8) || ']'),
  i % 3 = 0,
  datetime('2024-01-01 00:00:00', '+' || (i * 17) || ' hours')
FROM seq;

CREATE TABLE shop_products (
  id          INTEGER PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  price       DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT 1,
  dimensions  JSON,
  tags        JSON
);

INSERT INTO shop_products (sku, name, price, stock, active, dimensions, tags) VALUES
  ('PLU-001', 'Capy plush, small',       12.99,  140, 1, '{"w":15,"h":12,"d":20,"unit":"cm"}',  '["plush","kids"]'),
  ('PLU-002', 'Capy plush, huge',        59.00,    8, 1, '{"w":60,"h":45,"d":80,"unit":"cm"}',  '["plush"]'),
  ('MUG-001', 'Mug "Ok I pull up"',       9.50,   55, 1, '{"w":8,"h":10,"d":8,"unit":"cm"}',    '["kitchen"]'),
  ('TEE-001', 'T-shirt, capy in onsen',  19.99,    0, 1, NULL,                                  '["apparel"]'),
  ('TEE-002', 'T-shirt, retired design', 14.99,   12, 0, NULL,                                  '["apparel","clearance"]'),
  ('STK-001', 'Sticker pack',             3.25, 1200, 1, '{"w":10,"h":15,"d":0.1,"unit":"cm"}', '[]'),
  ('BOK-001', 'Book: A Year of Naps',    24.00,   30, 1, '{"pages":212}',                       NULL),
  ('GFT-000', 'Gift card',                0.00, 9999, 1, NULL,                                  '["digital"]');

CREATE TABLE shop_orders (
  id           INTEGER PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES shop_customers (id),
  status       TEXT NOT NULL DEFAULT 'cart' CHECK (status IN ('cart', 'paid', 'shipped', 'delivered', 'refunded')),
  placed_at    DATETIME NOT NULL,
  shipped_at   DATETIME,
  address      JSON
);
CREATE INDEX shop_orders_customer_idx ON shop_orders (customer_id);

WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 400)
INSERT INTO shop_orders (customer_id, status, placed_at, shipped_at, address)
SELECT
  printf('c0000000-0000-4000-8000-%012d', 1 + (i * 7) % 150),
  json_extract('["cart","paid","shipped","delivered","refunded"]', '$[' || (i % 5) || ']'),
  datetime('2025-02-01 03:00:00', '+' || (i * 433) || ' minutes'),
  CASE WHEN i % 5 IN (2, 3) THEN datetime('2025-02-03 03:00:00', '+' || (i * 433) || ' minutes') END,
  json_object('city', json_extract('["Jakarta","Austin","Osaka","Recife","Singapore"]', '$[' || (i % 5) || ']'), 'zip', printf('%05d', i * 37 % 99999))
FROM seq;

CREATE TABLE shop_order_items (
  order_id    INTEGER REFERENCES shop_orders (id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES shop_products (id),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  unit_price  DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

WITH RECURSIVE o(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM o WHERE i < 400),
               n(j) AS (SELECT 1 UNION ALL SELECT j + 1 FROM n WHERE j < 3)
INSERT OR IGNORE INTO shop_order_items (order_id, product_id, qty, unit_price)
SELECT i, p.id, 1 + (i * p.id) % 4, p.price
FROM o JOIN n ON n.j <= 1 + o.i % 3
JOIN shop_products p ON p.id = 1 + (o.i * n.j) % 8;

CREATE VIEW shop_v_order_totals AS
SELECT o.id, o.status, c.email, sum(i.qty * i.unit_price) AS total, count(*) AS line_count
FROM shop_orders o
JOIN shop_customers c ON c.id = o.customer_id
JOIN shop_order_items i ON i.order_id = o.id
GROUP BY o.id;

-- ────────────────────────────────── lab ──────────────────────────────────

-- Loose typing: declared types are hints, values keep their own storage class.
CREATE TABLE lab_type_zoo (
  id          INTEGER PRIMARY KEY,
  label       TEXT,
  c_bool      BOOLEAN,
  c_int       INTEGER,
  c_bigint    BIGINT,
  c_real      REAL,
  c_numeric   NUMERIC,
  c_text      TEXT,
  c_blob      BLOB,
  c_date      DATE,
  c_datetime  DATETIME,
  c_json      JSON,
  c_any                      -- no declared type at all
);

INSERT INTO lab_type_zoo (label, c_bool, c_int, c_bigint, c_real, c_numeric, c_text, c_blob, c_date, c_datetime, c_json, c_any) VALUES
  ('normal',  1, 1234, 9007199254740993, 3.14, 12345.6789, 'Capybaras are the largest living rodents.', x'deadbeef', '2024-02-29', '2024-02-29 13:37:00', '{"a":1,"b":[1,2,3]}', 'text'),
  ('falsy',   0, 0, 0, 0.0, 0, '', x'', '1970-01-01', '1970-01-01 00:00:00', 'null', 0),
  (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('extreme', 1, 9223372036854775807, 9223372036854775807, 1e308, 123456789012345678901234567890.123, replace(hex(zeroblob(3000)), '00', 'xo'), randomblob(512), '9999-12-31', '9999-12-31 23:59:59', '[{"x":null},{"y":[[]]}]', 1.5),
  ('negative',0, -9223372036854775808, -1, -1e308, -0.000000001, '-', x'00', '0001-01-01', '0001-01-01 00:00:00', '[-1,-2]', x'ff'),
  ('unicode', 1, 1, 1, 1.0, 1, 'Tab' || char(9) || 'here, newline' || char(10) || 'here, emoji 🦫🍊, RTL مرحبا, CJK カピバラ', x'f09fa6ab', '2025-12-31', '2025-12-31T23:59:59+05:30', '{"🦫":"カピバラ"}', 'カピバラ'),
  ('wrong types', 'yes', 'not a number', '12abc', 'NaN?', 'n/a', 42, 'text in blob column', 'not a date', 1735689600, 'not json', NULL),
  ('bool as text', 'false', '0', '1', '1.0', '0.0', 'true', NULL, '2025-01-01', '2025-01-01', 'false', 'FALSE');

-- STRICT table: values must match the declared type.
CREATE TABLE lab_strict_types (
  id    INTEGER PRIMARY KEY,
  i     INTEGER NOT NULL,
  r     REAL,
  t     TEXT,
  b     BLOB,
  a     ANY
) STRICT;

INSERT INTO lab_strict_types (i, r, t, b, a) VALUES
  (1, 1.5, 'one', x'01', 'text'),
  (0, 0.0, '', x'', 0),
  (-1, NULL, NULL, NULL, x'ff');

-- 20,000 rows: for paging, scrolling and big-result warnings.
CREATE TABLE lab_events (
  id          INTEGER PRIMARY KEY,
  happened_at DATETIME NOT NULL,
  kind        TEXT NOT NULL,
  actor       TEXT,
  ok          BOOLEAN NOT NULL,
  latency_ms  INTEGER,
  payload     JSON
);
CREATE INDEX lab_events_time_idx ON lab_events (happened_at);
CREATE INDEX lab_events_kind_idx ON lab_events (kind);

WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 20000)
INSERT INTO lab_events (happened_at, kind, actor, ok, latency_ms, payload)
SELECT
  datetime('2025-06-01 00:00:00', '+' || (i * 41) || ' seconds'),
  json_extract('["login","logout","feed","bath","nap","escape","photo","purchase"]', '$[' || (i % 8) || ']'),
  CASE WHEN i % 11 = 0 THEN NULL ELSE 'user_' || (i % 333) END,
  i % 13 <> 0,
  CASE WHEN i % 17 = 0 THEN NULL ELSE (i * 31) % 2500 END,
  CASE WHEN i % 5 = 0 THEN NULL ELSE json_object('seq', i, 'tags', json_array('t' || (i % 4), 't' || (i % 7))) END
FROM seq;

-- 40 columns, to test horizontal scroll and column width.
CREATE TABLE lab_wide_table (
  id INTEGER PRIMARY KEY,
  col_01 TEXT, col_02 TEXT, col_03 TEXT, col_04 TEXT, col_05 TEXT, col_06 TEXT, col_07 TEXT, col_08 TEXT, col_09 TEXT, col_10 TEXT,
  col_11 TEXT, col_12 TEXT, col_13 TEXT, col_14 TEXT, col_15 TEXT, col_16 TEXT, col_17 TEXT, col_18 TEXT, col_19 TEXT, col_20 TEXT,
  col_21 TEXT, col_22 TEXT, col_23 TEXT, col_24 TEXT, col_25 TEXT, col_26 TEXT, col_27 TEXT, col_28 TEXT, col_29 TEXT, col_30 TEXT,
  col_31 TEXT, col_32 TEXT, col_33 TEXT, col_34 TEXT, col_35 TEXT, col_36 TEXT, col_37 TEXT, col_38 TEXT, col_39 TEXT, col_40 TEXT
);

WITH RECURSIVE seq(r) AS (SELECT 1 UNION ALL SELECT r + 1 FROM seq WHERE r < 25)
INSERT INTO lab_wide_table (
  col_01, col_02, col_03, col_04, col_05, col_06, col_07, col_08, col_09, col_10,
  col_11, col_12, col_13, col_14, col_15, col_16, col_17, col_18, col_19, col_20,
  col_21, col_22, col_23, col_24, col_25, col_26, col_27, col_28, col_29, col_30,
  col_31, col_32, col_33, col_34, col_35, col_36, col_37, col_38, col_39, col_40)
SELECT
  'r'||r||'c1',  'r'||r||'c2',  'r'||r||'c3',  'r'||r||'c4',  'r'||r||'c5',  'r'||r||'c6',  'r'||r||'c7',  'r'||r||'c8',  'r'||r||'c9',  'r'||r||'c10',
  'r'||r||'c11', 'r'||r||'c12', 'r'||r||'c13', 'r'||r||'c14', 'r'||r||'c15', 'r'||r||'c16', 'r'||r||'c17', 'r'||r||'c18', 'r'||r||'c19', 'r'||r||'c20',
  'r'||r||'c21', 'r'||r||'c22', 'r'||r||'c23', 'r'||r||'c24', 'r'||r||'c25', 'r'||r||'c26', 'r'||r||'c27', 'r'||r||'c28', 'r'||r||'c29', 'r'||r||'c30',
  'r'||r||'c31', 'r'||r||'c32', 'r'||r||'c33', 'r'||r||'c34', 'r'||r||'c35', 'r'||r||'c36', 'r'||r||'c37', 'r'||r||'c38', 'r'||r||'c39', 'r'||r||'c40'
FROM seq;

-- Plain rowid table with no declared primary key.
CREATE TABLE lab_no_pk (
  name   TEXT,
  score  INTEGER,
  seen   BOOLEAN
);
INSERT INTO lab_no_pk VALUES ('dup', 1, 1), ('dup', 1, 1), ('solo', 2, 0), (NULL, NULL, NULL);

-- Names that need quoting.
CREATE TABLE "lab Mixed Case" (
  "ID"          INTEGER PRIMARY KEY,
  "select"      TEXT,
  "from"        INTEGER,
  "has space"   BOOLEAN,
  "dash-name"   TEXT,
  "UPPER"       TEXT
);
INSERT INTO "lab Mixed Case" ("select", "from", "has space", "dash-name", "UPPER") VALUES
  ('reserved word', 1, 1, 'a-b', 'X'),
  ('another', 2, 0, NULL, 'Y');

-- Empty table: the grid's empty state.
CREATE TABLE lab_empty_table (
  id    INTEGER PRIMARY KEY,
  note  TEXT
);

-- Throwaway rows for the write guard: DELETE, UPDATE without WHERE, DROP.
CREATE TABLE lab_scratch (
  id     INTEGER PRIMARY KEY,
  label  TEXT NOT NULL,
  n      INTEGER NOT NULL DEFAULT 0
);
WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 250)
INSERT INTO lab_scratch (label, n) SELECT 'row ' || i, i FROM seq;

-- For the Columns view editor. SQLite can only rename, add and drop,
-- and must refuse to drop indexed_col (indexed) and habitat_id (foreign key).
CREATE TABLE lab_alter_me (
  id           INTEGER PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT 'untitled',
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  maybe_null   INTEGER,
  amount       NUMERIC DEFAULT 0.00,
  indexed_col  TEXT,
  habitat_id   INTEGER REFERENCES habitats (id),
  droppable    TEXT DEFAULT 'drop me'
);
CREATE INDEX lab_alter_me_indexed_idx ON lab_alter_me (indexed_col);
WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < 30)
INSERT INTO lab_alter_me (title, status, maybe_null, amount, indexed_col, habitat_id)
SELECT 'Item ' || i, json_extract('["pending","done","failed"]', '$[' || (i % 3) || ']'), CASE WHEN i % 4 = 0 THEN NULL ELSE i END, i * 1.5, 'k' || (i % 7), 1 + i % 5
FROM seq;

COMMIT;
PRAGMA foreign_keys = ON;
ANALYZE;
