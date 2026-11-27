# Dummy data for live testing

One capybara sanctuary, seeded into every engine ypacapy talks to. Each script is safe to re-run: it drops and rebuilds only its own objects.

| Engine | File | Creates |
| --- | --- | --- |
| PostgreSQL 13+ | `postgres.sql` | schemas `sanctuary`, `shop`, `lab` in the database you pick |
| MySQL 8.0+ / MariaDB 10.6+ | `mysql.sql` | databases `capy_sanctuary`, `capy_shop`, `capy_lab` |
| SQLite 3.37+ | `sqlite.sql` | tables in the file you pick (`shop_`, `lab_` prefixes stand in for schemas) |
| MongoDB 6.0+ | `mongo.js` | databases `capy` and `capy_archive` |
| Redis 6.2+ | `redis.sh` | keys `capy:*` (plus `capy/…`, `capy.…`) in databases 0 and 1 |

## Load it

```sh
# PostgreSQL
createdb capy
psql -d capy -f dev/seed/postgres.sql

# MySQL / MariaDB
mysql -u root -p < dev/seed/mysql.sql

# SQLite
sqlite3 ~/capy.sqlite < dev/seed/sqlite.sql

# MongoDB
mongosh "mongodb://localhost:27017" dev/seed/mongo.js

# Redis (any redis-cli flags pass through)
bash dev/seed/redis.sh
bash dev/seed/redis.sh -h 127.0.0.1 -p 6380 -a secret
```

No local server? Pipe the file into a container instead:

```sh
docker exec -i <mysql-container> mysql -uroot -p<pw> < dev/seed/mysql.sql
docker exec -i <mongo-container> mongosh --quiet --file /dev/stdin < dev/seed/mongo.js
```

## What to test where

Names below use the Postgres layout. MySQL uses `capy_<schema>.<table>`, SQLite uses `<table>`, `shop_<table>` or `lab_<table>`.

### Schema tree and connections

| Feature | Use |
| --- | --- |
| Databases, schemas | PG: 3 schemas. MySQL: 3 databases. Mongo: `capy` + `capy_archive`. Redis: db 0 and db 1 |
| Views, materialized views | `sanctuary.v_capybara_summary`, `shop.v_order_totals`, `sanctuary.mv_daily_grams` (PG) |
| Foreign tables | `lab.etc_shells` (PG, needs superuser for `file_fdw`; skipped with a notice otherwise) |
| Functions, procedures | `sanctuary.capy_age`, `lab.nap`, `lab.reset_scratch`, MySQL `capy_shop.refund_order` |
| Partitions | `lab.metrics` and its three partitions (PG) |
| Planner-estimate row counts | `lab.events` (20,000), `sanctuary.feedings` (5,000) |
| Heartbeat | any SQL, Mongo or Redis connection; SQLite is never pinged |

### SQL console

| Feature | Try |
| --- | --- |
| Row limit, Next / Previous | `SELECT * FROM lab.events;` (limit 100 added, 200 pages) |
| 10,000-row cap | `SELECT * FROM lab.events UNION ALL SELECT * FROM lab.events;` or a query the limit can't be added to |
| Warning: more than 100 rows | `SELECT * FROM sanctuary.feedings LIMIT 500;` |
| Warning: `UPDATE` without `WHERE` | `UPDATE lab.scratch SET n = 0;` |
| Cancel, statement timeout, Task manager | `SELECT lab.nap(60);` (PG), `SELECT capy_lab.nap(60);` (MySQL), or `SELECT pg_sleep(60);` / `SELECT SLEEP(60);` in two tabs |
| Error with `LINE n:` and caret | `SELECT name, FROM sanctuary.capybaras;` |
| Multi-statement run | `SELECT 1; SELECT * FROM sanctuary.habitats; SELECT now();` |
| DDL reloads the tree | `CREATE TABLE lab.tmp (id int); DROP TABLE lab.tmp;` |
| Autocomplete (tables, aliases, columns) | `SELECT c. FROM sanctuary.capybaras c JOIN sanctuary.habitats h ON h.id = c.habitat_id` |
| Single-column result hugs its column | `SELECT id FROM sanctuary.capybaras;` |
| Quoting | `SELECT "select", "has space" FROM lab."Mixed Case Table";` |

### Result grid and editing

| Feature | Use |
| --- | --- |
| Typed cells: booleans incl. `false` and `NULL` | `sanctuary.capybaras.is_vaccinated` (true / false / null), `lab.type_zoo` row `falsy` |
| JSON, arrays, bytes, UUID, intervals, money, ranges, enums | `lab.type_zoo` (one column per type), `sanctuary.capybaras.traits` / `tags` / `photo` |
| Extremes: NaN, ±Infinity, ±max ints, `infinity` dates, long text, big blobs | `lab.type_zoo` rows `extreme`, `negative` |
| Unicode, emoji, RTL, tabs, newlines | `lab.type_zoo` row `unicode`, `sanctuary.keepers` (Hana's note) |
| MySQL `BIT(1)`, `SET`, `YEAR`, `TIME` past 24 h, `POINT`, zero dates | `capy_lab.type_zoo`, `capy_lab.zero_dates` |
| SQLite loose and `STRICT` typing | `lab_type_zoo` rows `wrong types`, `bool as text`; `lab_strict_types` |
| Frozen PK columns, horizontal scroll | `lab.wide_table` (40 columns) |
| Edit in place, single PK | `sanctuary.capybaras`, `lab.scratch` |
| Edit in place, composite PK | `sanctuary.capybara_keepers`, `shop.order_items` |
| Edit refused: no PK, join, view | `lab.no_pk`, any join, `shop.v_order_totals` |
| Empty state | `lab.empty_table`; a filter that matches nothing |
| Export CSV / JSON / Markdown / text | anything; `lab.type_zoo` stresses escaping |

### Table tabs and column editor

| Feature | Use |
| --- | --- |
| `WHERE` filter, rows per page | `sanctuary.feedings` with `food = 'orange' AND finished = false` |
| Columns, indexes, foreign keys | `sanctuary.capybaras` (GIN, unique, self FK), `shop.orders` |
| Rename, retype, nullable, default, add, drop | `lab.alter_me` |
| `NOT NULL` on a column holding nulls must warn | `lab.alter_me.maybe_null` |
| Drop a column with an index or FK must warn / be refused | `lab.alter_me.indexed_col`, `lab.alter_me.habitat_id` |
| MySQL keeps charset, `AUTO_INCREMENT`, `ON UPDATE`, `INVISIBLE`, comment | `capy_lab.alter_me` (`legacy_name`, `id`, `updated_at`, `secret_note`) |
| MySQL generated column locked | `capy_lab.alter_me.full_label` |
| MySQL defaults shown as SQL | `capy_lab.alter_me`: `'pending'`, `(uuid())`, `CURRENT_TIMESTAMP`, `no_default` |

### ER diagrams

| Feature | Use |
| --- | --- |
| Whole schema | `sanctuary` (7 tables), `shop` (5) |
| One table plus its links | `sanctuary.capybaras` |
| Self reference | `capybaras.mother_id` |
| Many-to-many via composite PK | `capybara_keepers`, `order_items` |
| Cardinality `0..1` (one-to-one) | `capybara_profiles.capybara_id` (PK and FK) |
| Cross-schema tables, dashed | PG: `shop.adoptions → sanctuary.capybaras` and `sanctuary.capybara_profiles → shop.customers`. MySQL: `capy_shop.adoptions → capy_sanctuary.capybaras` |
| Views left out of the picker | `v_capybara_summary` |

### Write guard

| Statement | Try on |
| --- | --- |
| `DELETE`, `UPDATE`, `INSERT` | `lab.scratch` |
| `TRUNCATE`, `DROP` | `lab.scratch`, then `CALL lab.reset_scratch();` |
| `REPLACE` (MySQL) | `REPLACE INTO capy_lab.scratch (id, label) VALUES (1, 'x');` |
| Write hidden in a CTE / `EXPLAIN ANALYZE` | `WITH d AS (DELETE FROM lab.scratch WHERE id < 5 RETURNING *) SELECT * FROM d;` |
| `ALTER`, `CREATE`, `GRANT`, `REVOKE` | `lab.alter_me` |

### MongoDB (`capy`)

| Feature | Use |
| --- | --- |
| Query bar with `ObjectId()`, `ISODate()`, `/regex/`, unquoted keys | `capybaras`: `{ name: /^b/i, born_on: { $gt: ISODate("2018-01-01") } }`, or `{ habitat_id: ObjectId("…") }` from a habitat |
| Project, Sort, Skip, Limit | `feedings` sorted `{ fed_at: -1 }` |
| Pager `1 – 20 of ~N`, click count with a filter | `events` (20,000), `feedings` (5,000) |
| Table view: missing fields hatched, per-field counts | `capybaras` (`bio`, `vet`, `photo`, `location`, `is_vaccinated` come and go), `events` |
| Mixed BSON types in one field | `capybaras.weight_kg` (decimal, sometimes a string) |
| Every BSON type | `type_zoo` (double, int32, int64, decimal128, UUID, binary, MD5, regex, timestamp, code, minKey, maxKey, NaN, -0, ±Infinity) |
| Folded objects and arrays in JSON cards | `orders.items`, `type_zoo` row `extreme` (200-item array, 6 levels deep) |
| Edit, duplicate, delete by `_id` | `scratch`; `odd_ids` has string, int, long, UUID, object, date and double `_id`s |
| Add document, Example from fields | `empty_coll` (empty), `capybaras` |
| Server-side validation error | `validated` (insert `{ name: "" }`) |
| Fields tab (dotted paths) | `capybaras` (`traits.measurements.length_cm`), `orders` |
| Indexes: unique, compound, text, 2dsphere, partial, sparse, hashed, TTL | `capybaras`, `orders`, `feedings`, `sessions` |
| Info (`$collStats`) for capped, time series, view | `recent_logs`, `pool_temps`, `v_capybara_summary` |
| Console | `db.orders.aggregate([{ $unwind: "$items" }, { $group: { _id: "$items.sku", qty: { $sum: "$items.qty" } } }])`, `db.capybaras.distinct("mood")`, `db.events.find({ kind: "nap" }).explain()` |
| Write guard | `db.scratch.deleteMany({})`, `db.scratch.drop()`, `db.scratch.renameCollection("scratch2")`, `$out` in an aggregate |

### Redis

| Feature | Use |
| --- | --- |
| Folders on `:` | `capy:capybara:*` (60), `capy:a:b:c:d:e:deep`, `capy::double` |
| Other separators (per connection) | `capy/slash/style/key`, `capy.dot.style.key` |
| SCAN about 1,000 at a time, Scan more | `capy:bulk:0001` … `capy:bulk:3000` |
| Every type | string, hash, list, set, zset (`capy:leaderboard:naps`, geo `capy:geo:habitats`), stream (`capy:stream:events`, has a consumer group) |
| Key tab paging | `capy:big:hash` (2,000 fields, HSCAN), `capy:queue:feedings` (500), `capy:big:set` (1,500), `capy:big:zset` (1,000), `capy:stream:events` (300) |
| String as pretty JSON, big number kept exact | `capy:config:json` (`12345678901234567890`), `capy:config:pretty` |
| Edit string (`SET … KEEPTTL`), hash (`HSET`, `HDEL`) | `capy:config:name`, `capy:session:day` (has TTL), `capy:habitat:mud-spa` |
| Locked: raw bytes, over 1 MB | `capy:bytes:png`, `capy:bytes:mixed`, `capy:big:string` (1.1 MB) |
| TTL timer, `EXPIRE`, `PERSIST` | `capy:session:*` (10 min to a week), some `capy:capybara:*` |
| `WRONGTYPE` offers the right command | `GET capy:capybara:1` |
| Write guard, `KEYS` ask | `DEL capy:scratch:1`, `KEYS capy:*` |
| Database number | db 1 has `capy:db1:*` |
