-- ypacapy dummy data: PostgreSQL 13+
--
--   createdb capy
--   psql -d capy -f dev/seed/postgres.sql
--
-- Safe to re-run: it drops and rebuilds the schemas sanctuary, shop and lab.
-- Outside them it only adds the file_fdw extension and its server capy_files, if allowed.

\set ON_ERROR_STOP on
BEGIN;

DROP SCHEMA IF EXISTS sanctuary CASCADE;
DROP SCHEMA IF EXISTS shop CASCADE;
DROP SCHEMA IF EXISTS lab CASCADE;
CREATE SCHEMA sanctuary;
CREATE SCHEMA shop;
CREATE SCHEMA lab;

COMMENT ON SCHEMA sanctuary IS 'Capybaras, their keepers and what they eat';
COMMENT ON SCHEMA shop IS 'Gift shop: customers, products, orders';
COMMENT ON SCHEMA lab IS 'Edge cases for the grid and editor';

-- ─────────────────────────────── sanctuary ───────────────────────────────

CREATE TYPE sanctuary.mood AS ENUM ('chill', 'sleepy', 'hungry', 'zoomies', 'grumpy');

CREATE TABLE sanctuary.habitats (
  id         serial PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  biome      text NOT NULL CHECK (biome IN ('wetland', 'river', 'savanna', 'forest')),
  area_m2    numeric(10, 2) NOT NULL,
  has_pool   boolean NOT NULL DEFAULT false,
  opened_on  date NOT NULL
);
COMMENT ON TABLE sanctuary.habitats IS 'Where the capybaras live';

INSERT INTO sanctuary.habitats (name, biome, area_m2, has_pool, opened_on) VALUES
  ('Mud Spa',     'wetland', 1250.50, true,  '2019-03-14'),
  ('Lazy River',  'river',   3400.00, true,  '2019-06-01'),
  ('Grass Flats', 'savanna', 5200.75, false, '2020-01-20'),
  ('Shady Grove', 'forest',  2100.00, false, '2021-09-09'),
  ('Hot Springs', 'wetland',  800.25, true,  '2023-12-24');

CREATE TABLE sanctuary.keepers (
  id           serial PRIMARY KEY,
  full_name    text NOT NULL,
  email        text UNIQUE,
  hired_at     timestamptz NOT NULL,
  is_active    boolean NOT NULL,
  shift_start  time,
  notes        text
);

INSERT INTO sanctuary.keepers (full_name, email, hired_at, is_active, shift_start, notes) VALUES
  ('Ana Souza',      'ana@capy.test',    '2019-02-01 08:00+07', true,  '06:30', NULL),
  ('Budi Santoso',   'budi@capy.test',   '2019-05-12 09:00+07', true,  '07:00', 'Knows every capy by its squeak'),
  ('Chen Wei',       NULL,               '2020-07-30 10:15+07', false, NULL,    'Left in 2022, may come back'),
  ('Dewi Lestari',   'dewi@capy.test',   '2021-01-04 07:45+07', true,  '14:00', ''),
  ('Emeka Obi',      'emeka@capy.test',  '2021-11-11 11:11+07', true,  '22:00', 'Night shift'),
  ('Fatima Zahra',   'fatima@capy.test', '2022-03-08 08:30+07', false, '06:30', NULL),
  ('Gustavo Lima',   'gus@capy.test',    '2023-06-19 06:00+07', true,  '05:45', 'Brings oranges'),
  ('Hana Kobayashi', 'hana@capy.test',   '2024-09-02 09:30+07', true,  '10:00', E'Line one\nLine two');

CREATE TABLE sanctuary.capybaras (
  id             serial PRIMARY KEY,
  name           text NOT NULL,
  habitat_id     integer NOT NULL REFERENCES sanctuary.habitats (id),
  mother_id      integer REFERENCES sanctuary.capybaras (id) ON DELETE SET NULL,
  mood           sanctuary.mood NOT NULL DEFAULT 'chill',
  weight_kg      numeric(5, 1) NOT NULL,
  born_on        date NOT NULL,
  is_vaccinated  boolean,
  tags           text[] NOT NULL DEFAULT '{}',
  traits         jsonb NOT NULL DEFAULT '{}',
  chip_id        uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  photo          bytea
);
COMMENT ON COLUMN sanctuary.capybaras.is_vaccinated IS 'NULL means nobody checked yet';
CREATE INDEX capybaras_habitat_idx ON sanctuary.capybaras (habitat_id);
CREATE INDEX capybaras_traits_gin ON sanctuary.capybaras USING gin (traits);

-- 60 capybaras. The first 10 have no mother; the rest point at one of them.
INSERT INTO sanctuary.capybaras (name, habitat_id, mother_id, mood, weight_kg, born_on, is_vaccinated, tags, traits, photo)
SELECT
  (ARRAY['Bean','Mochi','Pickle','Nugget','Tofu','Waffle','Biscuit','Pudding','Noodle','Dumpling','Churro','Maple'])[1 + (i - 1) % 12]
    || CASE WHEN i > 12 THEN ' ' || ((i - 1) / 12 + 1) ELSE '' END,
  1 + i % 5,
  CASE WHEN i > 10 THEN 1 + (i * 7) % 10 END,
  (ARRAY['chill','sleepy','hungry','zoomies','grumpy'])[1 + i % 5]::sanctuary.mood,
  round(35 + (i * 37 % 300) / 10.0, 1),
  date '2015-01-01' + (i * 53 % 3000),
  CASE i % 3 WHEN 0 THEN false WHEN 1 THEN true END,
  CASE i % 4
    WHEN 0 THEN ARRAY['friendly']
    WHEN 1 THEN ARRAY['swimmer', 'napper']
    WHEN 2 THEN ARRAY[]::text[]
    ELSE ARRAY['escape artist', 'orange thief', 'vocal']
  END,
  jsonb_build_object(
    'fav_food',     (ARRAY['grass','watermelon','corn','orange','hay'])[1 + i % 5],
    'bath_minutes', i % 40,
    'likes_humans', i % 4 <> 0,
    'best_friend',  CASE WHEN i % 6 = 0 THEN NULL ELSE 'duck #' || i % 9 END,
    'measurements', jsonb_build_object('length_cm', 100 + i % 35, 'height_cm', 50 + i % 12)
  ),
  CASE WHEN i % 15 = 0 THEN decode('89504e470d0a1a0a', 'hex') END
FROM generate_series(1, 60) AS i
ORDER BY i;

-- One-to-one with capybaras (ERD: 1 on capybaras, 0..1 on profiles).
-- sponsor_id points into the shop schema; the FK is added after shop exists.
CREATE TABLE sanctuary.capybara_profiles (
  capybara_id     integer PRIMARY KEY REFERENCES sanctuary.capybaras (id) ON DELETE CASCADE,
  bio             text,
  instagram       text UNIQUE,
  favourite_spot  integer REFERENCES sanctuary.habitats (id),
  sponsor_id      uuid
);

INSERT INTO sanctuary.capybara_profiles (capybara_id, bio, instagram, favourite_spot)
SELECT i,
  CASE WHEN i % 3 = 0 THEN NULL ELSE 'Professional napper #' || i END,
  CASE WHEN i % 2 = 0 THEN '@capy_' || i END,
  CASE WHEN i % 4 = 0 THEN NULL ELSE 1 + i % 5 END
FROM generate_series(1, 40) AS i;

CREATE TABLE sanctuary.capybara_keepers (
  capybara_id  integer REFERENCES sanctuary.capybaras (id) ON DELETE CASCADE,
  keeper_id    integer REFERENCES sanctuary.keepers (id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'carer',
  since        date NOT NULL,
  PRIMARY KEY (capybara_id, keeper_id)
);

INSERT INTO sanctuary.capybara_keepers (capybara_id, keeper_id, role, since)
SELECT c, 1 + (c * k) % 8, CASE WHEN k = 1 THEN 'lead' ELSE 'carer' END, date '2020-01-01' + c * 11
FROM generate_series(1, 60) AS c, generate_series(1, 2) AS k
ON CONFLICT DO NOTHING;

-- 5,000 feedings: enough to page and to trip the big-result warning.
CREATE TABLE sanctuary.feedings (
  id           bigserial PRIMARY KEY,
  capybara_id  integer NOT NULL REFERENCES sanctuary.capybaras (id) ON DELETE CASCADE,
  keeper_id    integer REFERENCES sanctuary.keepers (id) ON DELETE SET NULL,
  fed_at       timestamptz NOT NULL,
  food         text NOT NULL,
  grams        integer NOT NULL CHECK (grams > 0),
  finished     boolean NOT NULL,
  note         text
);
CREATE INDEX feedings_capy_time_idx ON sanctuary.feedings (capybara_id, fed_at DESC);

INSERT INTO sanctuary.feedings (capybara_id, keeper_id, fed_at, food, grams, finished, note)
SELECT
  1 + i % 60,
  CASE WHEN i % 97 = 0 THEN NULL ELSE 1 + i % 8 END,
  timestamptz '2025-01-01 06:00+07' + (i * interval '97 minutes'),
  (ARRAY['grass','hay','watermelon','corn','orange','pellets'])[1 + i % 6],
  50 + (i * 13) % 900,
  i % 7 <> 0,
  CASE WHEN i % 50 = 0 THEN 'Ate the bowl too' END
FROM generate_series(1, 5000) AS i;

CREATE TABLE sanctuary.vet_visits (
  id           serial PRIMARY KEY,
  capybara_id  integer NOT NULL REFERENCES sanctuary.capybaras (id) ON DELETE CASCADE,
  visited_at   timestamp NOT NULL,
  took         interval NOT NULL,
  cost         money NOT NULL,
  diagnosis    text,
  follow_up    date
);

INSERT INTO sanctuary.vet_visits (capybara_id, visited_at, took, cost, diagnosis, follow_up)
SELECT
  1 + (i * 3) % 60,
  timestamp '2024-01-10 09:00' + i * interval '5 days 3 hours',
  (15 + i % 90) * interval '1 minute',
  (75 + i * 12.5)::numeric::money,
  (ARRAY['Healthy', 'Overgrown teeth', 'Mild sunburn', NULL, 'Ate a sock'])[1 + i % 5],
  CASE WHEN i % 4 = 0 THEN date '2025-06-01' + i END
FROM generate_series(1, 80) AS i;

CREATE VIEW sanctuary.v_capybara_summary AS
SELECT
  c.id, c.name, h.name AS habitat, c.mood, c.weight_kg,
  m.name AS mother,
  count(f.id) AS feedings,
  max(f.fed_at) AS last_fed
FROM sanctuary.capybaras c
JOIN sanctuary.habitats h ON h.id = c.habitat_id
LEFT JOIN sanctuary.capybaras m ON m.id = c.mother_id
LEFT JOIN sanctuary.feedings f ON f.capybara_id = c.id
GROUP BY c.id, h.name, m.name;

CREATE MATERIALIZED VIEW sanctuary.mv_daily_grams AS
SELECT date_trunc('day', fed_at)::date AS day, sum(grams) AS grams, count(*) AS meals
FROM sanctuary.feedings
GROUP BY 1;

CREATE FUNCTION sanctuary.capy_age(born date) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT extract(year FROM age(born))::integer $$;

-- ───────────────────────────────── shop ──────────────────────────────────

CREATE TABLE shop.customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  name        text NOT NULL,
  country     char(2) NOT NULL,
  marketing   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO shop.customers (email, name, country, marketing, created_at)
SELECT
  'fan' || i || '@example.test',
  (ARRAY['Rina','Tom','Aiko','Luis','Mei','Omar','Sara','Ivan','Nadia','Kofi'])[1 + i % 10] || ' ' ||
  (ARRAY['Putri','Smith','Tanaka','Garcia','Lin','Haddad','Berg','Petrov','Rahman','Mensah'])[1 + (i / 10) % 10],
  (ARRAY['ID','US','JP','BR','SG','DE','NG','AU'])[1 + i % 8],
  i % 3 = 0,
  timestamptz '2024-01-01 00:00+00' + i * interval '17 hours'
FROM generate_series(1, 150) AS i;

CREATE TABLE shop.products (
  id          serial PRIMARY KEY,
  sku         text NOT NULL UNIQUE,
  name        text NOT NULL,
  price       numeric(10, 2) NOT NULL CHECK (price >= 0),
  stock       integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  dimensions  jsonb,
  tags        text[]
);

INSERT INTO shop.products (sku, name, price, stock, active, dimensions, tags) VALUES
  ('PLU-001', 'Capy plush, small',      12.99,  140, true,  '{"w":15,"h":12,"d":20,"unit":"cm"}', '{plush,kids}'),
  ('PLU-002', 'Capy plush, huge',       59.00,    8, true,  '{"w":60,"h":45,"d":80,"unit":"cm"}', '{plush}'),
  ('MUG-001', 'Mug "Ok I pull up"',      9.50,   55, true,  '{"w":8,"h":10,"d":8,"unit":"cm"}',   '{kitchen}'),
  ('TEE-001', 'T-shirt, capy in onsen', 19.99,    0, true,  NULL,                                 '{apparel}'),
  ('TEE-002', 'T-shirt, retired design', 14.99,  12, false, NULL,                                 '{apparel,clearance}'),
  ('STK-001', 'Sticker pack',            3.25, 1200, true,  '{"w":10,"h":15,"d":0.1,"unit":"cm"}', '{}'),
  ('BOK-001', 'Book: A Year of Naps',   24.00,   30, true,  '{"pages":212}',                      NULL),
  ('GFT-000', 'Gift card',               0.00, 9999, true,  NULL,                                 '{digital}');

CREATE TYPE shop.order_status AS ENUM ('cart', 'paid', 'shipped', 'delivered', 'refunded');

CREATE TABLE shop.orders (
  id           serial PRIMARY KEY,
  customer_id  uuid NOT NULL REFERENCES shop.customers (id),
  status       shop.order_status NOT NULL DEFAULT 'cart',
  placed_at    timestamptz NOT NULL,
  shipped_at   timestamptz,
  address      jsonb
);
CREATE INDEX orders_customer_idx ON shop.orders (customer_id);

INSERT INTO shop.orders (customer_id, status, placed_at, shipped_at, address)
SELECT
  c.id,
  s.status,
  timestamptz '2025-02-01 10:00+07' + g.i * interval '7 hours 13 minutes',
  CASE WHEN s.status IN ('shipped', 'delivered') THEN timestamptz '2025-02-03 10:00+07' + g.i * interval '7 hours 13 minutes' END,
  jsonb_build_object('city', (ARRAY['Jakarta','Austin','Osaka','Recife','Singapore'])[1 + g.i % 5], 'zip', lpad((g.i * 37 % 99999)::text, 5, '0'))
FROM generate_series(1, 400) AS g(i)
JOIN LATERAL (SELECT id FROM shop.customers ORDER BY email OFFSET (g.i * 7) % 150 LIMIT 1) c ON true
CROSS JOIN LATERAL (SELECT (ARRAY['cart','paid','shipped','delivered','refunded'])[1 + g.i % 5]::shop.order_status AS status) s;

CREATE TABLE shop.order_items (
  order_id    integer REFERENCES shop.orders (id) ON DELETE CASCADE,
  product_id  integer REFERENCES shop.products (id),
  qty         smallint NOT NULL CHECK (qty > 0),
  unit_price  numeric(10, 2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO shop.order_items (order_id, product_id, qty, unit_price)
SELECT o, p, 1 + (o * p) % 4, pr.price
FROM generate_series(1, 400) AS o
CROSS JOIN LATERAL (SELECT 1 + (o * n) % 8 AS p FROM generate_series(1, 1 + o % 3) AS n) x
JOIN shop.products pr ON pr.id = x.p
ON CONFLICT DO NOTHING;

-- Cross-schema links, both directions (ERD draws the other schema's table dashed):
-- shop.adoptions -> sanctuary.capybaras, and sanctuary.capybara_profiles -> shop.customers.
CREATE TABLE shop.adoptions (
  id           serial PRIMARY KEY,
  customer_id  uuid NOT NULL REFERENCES shop.customers (id),
  capybara_id  integer NOT NULL REFERENCES sanctuary.capybaras (id),
  tier         text NOT NULL DEFAULT 'bronze',
  monthly      numeric(8, 2) NOT NULL,
  since        date NOT NULL DEFAULT current_date,
  UNIQUE (customer_id, capybara_id)
);

INSERT INTO shop.adoptions (customer_id, capybara_id, tier, monthly, since)
SELECT c.id, 1 + (g.i * 11) % 60, (ARRAY['bronze','silver','gold'])[1 + g.i % 3], 5 + (g.i % 3) * 10, date '2024-03-01' + g.i * 3
FROM generate_series(1, 90) AS g(i)
JOIN LATERAL (SELECT id FROM shop.customers ORDER BY email OFFSET (g.i * 13) % 150 LIMIT 1) c ON true
ON CONFLICT DO NOTHING;

ALTER TABLE sanctuary.capybara_profiles
  ADD CONSTRAINT capybara_profiles_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES shop.customers (id) ON DELETE SET NULL;
UPDATE sanctuary.capybara_profiles p
SET sponsor_id = (SELECT id FROM shop.customers ORDER BY email OFFSET p.capybara_id LIMIT 1)
WHERE p.capybara_id % 5 = 0;

CREATE VIEW shop.v_order_totals AS
SELECT o.id, o.status, c.email, sum(i.qty * i.unit_price) AS total, count(*) AS line_count
FROM shop.orders o
JOIN shop.customers c ON c.id = o.customer_id
JOIN shop.order_items i ON i.order_id = o.id
GROUP BY o.id, c.email;

-- ────────────────────────────────── lab ──────────────────────────────────

-- One column per common type. Row 1 is "normal", row 2 is falsy/zero/empty,
-- row 3 is all NULL, the rest are extremes.
CREATE TABLE lab.type_zoo (
  id            serial PRIMARY KEY,
  label         text,
  c_bool        boolean,
  c_smallint    smallint,
  c_int         integer,
  c_bigint      bigint,
  c_real        real,
  c_double      double precision,
  c_numeric     numeric,
  c_money       money,
  c_char        char(5),
  c_varchar     varchar(20),
  c_text        text,
  c_bytea       bytea,
  c_date        date,
  c_time        time,
  c_timetz      timetz,
  c_timestamp   timestamp,
  c_timestamptz timestamptz,
  c_interval    interval,
  c_uuid        uuid,
  c_json        json,
  c_jsonb       jsonb,
  c_int_arr     integer[],
  c_text_arr    text[],
  c_bool_arr    boolean[],
  c_inet        inet,
  c_cidr        cidr,
  c_macaddr     macaddr,
  c_point       point,
  c_int4range   int4range,
  c_tsvector    tsvector,
  c_xml         xml,
  c_bit         bit(4),
  c_mood        sanctuary.mood
);

INSERT INTO lab.type_zoo VALUES
  (DEFAULT, 'normal', true, 42, 1234, 9007199254740993, 3.14, 2.718281828459045, 12345.6789, 19.99,
   'abc', 'hello', 'Capybaras are the largest living rodents.', '\xdeadbeef',
   '2024-02-29', '13:37:00', '13:37:00+07', '2024-02-29 13:37:00', '2024-02-29 13:37:00+07', '1 day 02:03:04',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '{"a":1,"b":[1,2,3]}', '{"nested":{"deep":{"deeper":true}}}',
   '{1,2,3}', '{"one","two","three"}', '{true,false,NULL}',
   '192.168.1.10', '10.0.0.0/8', '08:00:2b:01:02:03', '(1.5,2.5)', '[1,10)',
   to_tsvector('english', 'the quick capybara naps'), '<capy name="Bean"/>', B'1010', 'chill'),
  (DEFAULT, 'falsy', false, 0, 0, 0, 0, -0.0, 0, 0,
   '', '', '', '\x',
   '1970-01-01', '00:00:00', '00:00:00+00', '1970-01-01 00:00:00', '1970-01-01 00:00:00+00', '0 seconds',
   '00000000-0000-0000-0000-000000000000', 'null', '{}',
   '{}', '{}', '{false}',
   '0.0.0.0', '0.0.0.0/0', '00:00:00:00:00:00', '(0,0)', 'empty',
   '', '<empty/>', B'0000', 'grumpy'),
  (DEFAULT, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL,
   NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL),
  (DEFAULT, 'extreme', true, 32767, 2147483647, 9223372036854775807, 'Infinity', 'NaN',
   123456789012345678901234567890.123456789, 92233720368547758.07,
   'ZZZZZ', repeat('x', 20), repeat('Long text so the cell has to truncate. ', 150), decode(repeat('ff', 512), 'hex'),
   'infinity', '23:59:59.999999', '23:59:59+14', 'infinity', '-infinity', '-178000000 years',
   'ffffffff-ffff-ffff-ffff-ffffffffffff', '[{"x":null},{"y":[[]]}]', '"just a string"',
   '{-2147483648,0,2147483647}', '{"with,comma","with \"quote\"",NULL,""}', '{}',
   '::1', '2001:db8::/32', 'ff:ff:ff:ff:ff:ff', '(-1e10,1e10)', '[-2147483648,2147483647)',
   to_tsvector('simple', repeat('word ', 20)), '<a><b><c>deep</c></b></a>', B'1111', 'zoomies'),
  (DEFAULT, 'negative', false, -32768, -2147483648, -9223372036854775808, '-Infinity', -1.7976931348623157e308,
   -0.000000001, -92233720368547758.08,
   'neg', '-', '-', '\x00',
   '0001-01-01', '00:00:00.000001', '00:00:00-12', '0001-01-01 00:00:00', '0001-01-01 00:00:00+00', '-1 day -00:00:01',
   '12345678-1234-1234-1234-123456789abc', '-1', '[-1, -2]',
   '{-1}', '{"-"}', '{NULL}',
   '255.255.255.255', '192.168.0.0/16', '01:23:45:67:89:ab', '(-1,-1)', '(,0)',
   '', '<neg/>', B'0001', 'sleepy'),
  (DEFAULT, 'unicode', true, 1, 1, 1, 1, 1, 1, 1,
   'ñü', 'émoji 🦫', E'Tab\there, newline\nhere, emoji 🦫🍊, RTL مرحبا, CJK カピバラ, zero-width​space', '\xf09fa6ab',
   '2025-12-31', '12:00', '12:00+05:30', '2025-12-31 23:59:59', '2025-12-31 23:59:59+05:30', '1 year 2 months',
   'b1e2c3d4-0000-4000-8000-000000000001', '{"🦫":"カピバラ"}', '{"quote":"he said \"hi\"","slash":"a\\b"}',
   '{7}', '{"カピバラ","🦫"}', '{true}',
   '10.1.2.3/24', '172.16.0.0/12', 'aa:bb:cc:dd:ee:ff', '(3,4)', '[5,6]',
   to_tsvector('simple', 'カピバラ capybara'), '<name>カピバラ</name>', B'0110', 'hungry');

-- 20,000 rows: for paging, scrolling and big-result warnings.
CREATE TABLE lab.events (
  id          bigserial PRIMARY KEY,
  happened_at timestamptz NOT NULL,
  kind        text NOT NULL,
  actor       text,
  ok          boolean NOT NULL,
  latency_ms  integer,
  payload     jsonb
);
CREATE INDEX events_time_idx ON lab.events (happened_at);
CREATE INDEX events_kind_idx ON lab.events (kind);

INSERT INTO lab.events (happened_at, kind, actor, ok, latency_ms, payload)
SELECT
  timestamptz '2025-06-01 00:00+00' + i * interval '41 seconds',
  (ARRAY['login','logout','feed','bath','nap','escape','photo','purchase'])[1 + i % 8],
  CASE WHEN i % 11 = 0 THEN NULL ELSE 'user_' || (i % 333) END,
  i % 13 <> 0,
  CASE WHEN i % 17 = 0 THEN NULL ELSE (i * 31) % 2500 END,
  CASE WHEN i % 5 = 0 THEN NULL ELSE jsonb_build_object('seq', i, 'tags', jsonb_build_array('t' || i % 4, 't' || i % 7)) END
FROM generate_series(1, 20000) AS i;

-- 40 columns, to test horizontal scroll and column width.
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(format('col_%s text', lpad(n::text, 2, '0')), ', ') INTO cols FROM generate_series(1, 40) n;
  EXECUTE format('CREATE TABLE lab.wide_table (id serial PRIMARY KEY, %s)', cols);
  SELECT string_agg(format('''r'' || r || ''c%s''', n), ', ') INTO cols FROM generate_series(1, 40) n;
  EXECUTE format('INSERT INTO lab.wide_table (%s) SELECT %s FROM generate_series(1, 25) r',
    (SELECT string_agg(format('col_%s', lpad(n::text, 2, '0')), ', ') FROM generate_series(1, 40) n), cols);
END $$;

-- No primary key: editing should be refused or warned.
CREATE TABLE lab.no_pk (
  name   text,
  score  integer,
  seen   boolean
);
INSERT INTO lab.no_pk VALUES ('dup', 1, true), ('dup', 1, true), ('solo', 2, false), (NULL, NULL, NULL);

-- Names that need quoting.
CREATE TABLE lab."Mixed Case Table" (
  "ID"          serial PRIMARY KEY,
  "select"      text,
  "from"        integer,
  "has space"   boolean,
  "dash-name"   text,
  "UPPER"       text
);
INSERT INTO lab."Mixed Case Table" ("select", "from", "has space", "dash-name", "UPPER") VALUES
  ('reserved word', 1, true, 'a-b', 'X'),
  ('another', 2, false, NULL, 'Y');

-- Empty table: the grid's empty state.
CREATE TABLE lab.empty_table (
  id    serial PRIMARY KEY,
  note  text
);

-- Throwaway rows for the write guard: DELETE, UPDATE without WHERE, TRUNCATE, DROP.
CREATE TABLE lab.scratch (
  id     serial PRIMARY KEY,
  label  text NOT NULL,
  n      integer NOT NULL DEFAULT 0
);
INSERT INTO lab.scratch (label, n) SELECT 'row ' || i, i FROM generate_series(1, 250) AS i;

-- For the Columns view editor: rename, retype, nullable, default, add, drop.
-- maybe_null holds NULLs, so making it NOT NULL must warn and fail.
-- indexed_col and habitat_id carry an index and a foreign key, so dropping them warns.
CREATE TABLE lab.alter_me (
  id           serial PRIMARY KEY,
  title        varchar(50) NOT NULL DEFAULT 'untitled',
  status       text NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  token        uuid DEFAULT gen_random_uuid(),
  maybe_null   integer,
  amount       numeric(8, 2) DEFAULT 0.00,
  indexed_col  text,
  habitat_id   integer REFERENCES sanctuary.habitats (id),
  flags        boolean[] DEFAULT '{false,false}'
);
CREATE INDEX alter_me_indexed_idx ON lab.alter_me (indexed_col);
COMMENT ON COLUMN lab.alter_me.maybe_null IS 'Some rows are NULL';
INSERT INTO lab.alter_me (title, status, maybe_null, amount, indexed_col, habitat_id)
SELECT 'Item ' || i, (ARRAY['pending','done','failed'])[1 + i % 3], CASE WHEN i % 4 = 0 THEN NULL ELSE i END, i * 1.5, 'k' || i % 7, 1 + i % 5
FROM generate_series(1, 30) AS i;

-- Range-partitioned table: the parent and its partitions in the tree.
CREATE TABLE lab.metrics (
  taken_at  timestamptz NOT NULL,
  sensor    text NOT NULL,
  value     double precision,
  PRIMARY KEY (taken_at, sensor)
) PARTITION BY RANGE (taken_at);
CREATE TABLE lab.metrics_2025_01 PARTITION OF lab.metrics FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE lab.metrics_2025_02 PARTITION OF lab.metrics FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE lab.metrics_default PARTITION OF lab.metrics DEFAULT;
INSERT INTO lab.metrics
SELECT timestamptz '2025-01-01 00:00+00' + i * interval '1 hour', (ARRAY['pool_temp','air_temp','humidity'])[1 + i % 3], round((20 + random() * 15)::numeric, 2)
FROM generate_series(0, 2000) AS i;

-- Slow on purpose: Cancel, statement timeout and the Task manager.
--   SELECT lab.nap(60);
CREATE FUNCTION lab.nap(seconds double precision DEFAULT 45) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_sleep(seconds);
  RETURN 'Capy woke up after ' || seconds || ' s';
END $$;

CREATE PROCEDURE lab.reset_scratch()
LANGUAGE sql AS $$
  TRUNCATE lab.scratch RESTART IDENTITY;
  INSERT INTO lab.scratch (label, n) SELECT 'row ' || i, i FROM generate_series(1, 250) AS i;
$$;

-- Foreign table (schema tree). Needs the file_fdw extension and superuser;
-- skipped with a notice when either is missing.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS file_fdw;
  CREATE SERVER IF NOT EXISTS capy_files FOREIGN DATA WRAPPER file_fdw;
  CREATE FOREIGN TABLE lab.etc_shells (line text) SERVER capy_files OPTIONS (filename '/etc/shells');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped foreign table lab.etc_shells: %', SQLERRM;
END $$;

ANALYZE;
COMMIT;
