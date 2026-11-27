// ypacapy dummy data: MongoDB 6.0+ (run with mongosh)
//
//   mongosh "mongodb://localhost:27017" dev/seed/mongo.js
//
// Safe to re-run: it drops and rebuilds the databases capy and capy_archive.
// Nothing outside those two databases is touched.

db = db.getSiblingDB("capy");
db.dropDatabase();
db.getSiblingDB("capy_archive").dropDatabase();

const pick = (arr, i) => arr[i % arr.length];
const day = 24 * 3600 * 1000;
const at = (iso, plusMs = 0) => new Date(new Date(iso).getTime() + plusMs);
const insertInBatches = (coll, docs, size = 5000) => {
  for (let k = 0; k < docs.length; k += size) coll.insertMany(docs.slice(k, k + size), { ordered: false });
};

// ─────────────────────────────── sanctuary ───────────────────────────────

const habitatIds = Array.from({ length: 5 }, () => new ObjectId());
db.habitats.insertMany([
  { _id: habitatIds[0], name: "Mud Spa",     biome: "wetland", area_m2: 1250.5, has_pool: true,  opened_on: ISODate("2019-03-14") },
  { _id: habitatIds[1], name: "Lazy River",  biome: "river",   area_m2: 3400,   has_pool: true,  opened_on: ISODate("2019-06-01") },
  { _id: habitatIds[2], name: "Grass Flats", biome: "savanna", area_m2: 5200.75, has_pool: false, opened_on: ISODate("2020-01-20") },
  { _id: habitatIds[3], name: "Shady Grove", biome: "forest",  area_m2: 2100,   has_pool: false, opened_on: ISODate("2021-09-09") },
  { _id: habitatIds[4], name: "Hot Springs", biome: "wetland", area_m2: 800.25, has_pool: true,  opened_on: ISODate("2023-12-24"),
    location: { type: "Point", coordinates: [106.8456, -6.2088] } },
]);
db.habitats.createIndex({ name: 1 }, { unique: true });

const keeperIds = Array.from({ length: 8 }, () => new ObjectId());
db.keepers.insertMany([
  { _id: keeperIds[0], full_name: "Ana Souza",      email: "ana@capy.test",    hired_at: ISODate("2019-02-01T01:00:00Z"), is_active: true,  shift_start: "06:30" },
  { _id: keeperIds[1], full_name: "Budi Santoso",   email: "budi@capy.test",   hired_at: ISODate("2019-05-12T02:00:00Z"), is_active: true,  shift_start: "07:00", notes: "Knows every capy by its squeak" },
  { _id: keeperIds[2], full_name: "Chen Wei",       email: null,               hired_at: ISODate("2020-07-30T03:15:00Z"), is_active: false, notes: "Left in 2022, may come back" },
  { _id: keeperIds[3], full_name: "Dewi Lestari",   email: "dewi@capy.test",   hired_at: ISODate("2021-01-04T00:45:00Z"), is_active: true,  shift_start: "14:00", notes: "" },
  { _id: keeperIds[4], full_name: "Emeka Obi",      email: "emeka@capy.test",  hired_at: ISODate("2021-11-11T04:11:00Z"), is_active: true,  shift_start: "22:00", notes: "Night shift" },
  { _id: keeperIds[5], full_name: "Fatima Zahra",   email: "fatima@capy.test", hired_at: ISODate("2022-03-08T01:30:00Z"), is_active: false, shift_start: "06:30" },
  { _id: keeperIds[6], full_name: "Gustavo Lima",   email: "gus@capy.test",    hired_at: ISODate("2023-06-19T23:00:00Z"), is_active: true,  shift_start: "05:45", notes: "Brings oranges" },
  { _id: keeperIds[7], full_name: "Hana Kobayashi", email: "hana@capy.test",   hired_at: ISODate("2024-09-02T02:30:00Z"), is_active: true,  shift_start: "10:00", notes: "Line one\nLine two",
    certifications: [{ name: "Rodent first aid", year: 2024 }, { name: "Onsen safety", year: 2025 }] },
]);

// 60 capybaras. Shapes drift on purpose so the table view has hatched (missing) cells
// and a field with mixed BSON types (weight_kg is a string on a few documents).
const names = ["Bean", "Mochi", "Pickle", "Nugget", "Tofu", "Waffle", "Biscuit", "Pudding", "Noodle", "Dumpling", "Churro", "Maple"];
const moods = ["chill", "sleepy", "hungry", "zoomies", "grumpy"];
const foods = ["grass", "watermelon", "corn", "orange", "hay"];
const capyIds = Array.from({ length: 60 }, () => new ObjectId());
const capybaras = capyIds.map((_id, idx) => {
  const i = idx + 1;
  const doc = {
    _id,
    name: names[(i - 1) % 12] + (i > 12 ? " " + (Math.floor((i - 1) / 12) + 1) : ""),
    habitat_id: habitatIds[i % 5],
    mood: pick(moods, i),
    weight_kg: i % 20 === 0 ? "about " + (35 + (i % 10)) : Decimal128((35 + ((i * 37) % 300) / 10).toFixed(1)),
    born_on: at("2015-01-01", ((i * 53) % 3000) * day),
    tags: pick([["friendly"], ["swimmer", "napper"], [], ["escape artist", "orange thief", "vocal"]], i),
    traits: {
      fav_food: pick(foods, i),
      bath_minutes: NumberInt(i % 40),
      likes_humans: i % 4 !== 0,
      best_friend: i % 6 === 0 ? null : "duck #" + (i % 9),
      measurements: { length_cm: 100 + (i % 35), height_cm: 50 + (i % 12) },
    },
    chip_id: UUID(),
  };
  if (i > 10) doc.mother_id = capyIds[(i * 7) % 10];
  if (i % 3 !== 2) doc.is_vaccinated = i % 3 === 1; // missing on a third: nobody checked
  if (i % 15 === 0) doc.photo = BinData(0, "iVBORw0KGgo=");
  if (i % 5 === 0) doc.bio = "Professional napper #" + i + ". Enjoys warm baths and oranges.";
  if (i % 7 === 0) doc.vet = { last_visit: at("2025-03-01", i * day), notes: ["teeth ok", "weight ok"], cost: Decimal128((75 + i * 12.5).toFixed(2)) };
  if (i % 9 === 0) doc.location = { type: "Point", coordinates: [106.8 + i / 1000, -6.2 - i / 1000] };
  return doc;
});
db.capybaras.insertMany(capybaras);
db.capybaras.createIndex({ chip_id: 1 }, { unique: true });
db.capybaras.createIndex({ habitat_id: 1, mood: 1 });
db.capybaras.createIndex({ bio: "text", name: "text" }, { name: "capy_text" });
db.capybaras.createIndex({ location: "2dsphere" }, { sparse: true });
db.capybaras.createIndex({ mother_id: 1 }, { partialFilterExpression: { mother_id: { $exists: true } } });

// 5,000 feedings: enough to page and to check the "1 – 20 of ~N" estimate.
const feedFoods = ["grass", "hay", "watermelon", "corn", "orange", "pellets"];
const feedings = [];
for (let i = 1; i <= 5000; i++) {
  const doc = {
    capybara_id: capyIds[i % 60],
    keeper_id: i % 97 === 0 ? null : keeperIds[i % 8],
    fed_at: at("2024-12-31T23:00:00Z", i * 97 * 60 * 1000),
    food: pick(feedFoods, i),
    grams: NumberInt(50 + ((i * 13) % 900)),
    finished: i % 7 !== 0,
  };
  if (i % 50 === 0) doc.note = "Ate the bowl too";
  feedings.push(doc);
}
insertInBatches(db.feedings, feedings);
db.feedings.createIndex({ capybara_id: 1, fed_at: -1 });
db.feedings.createIndex({ food: "hashed" });

// ───────────────────────────────── shop ──────────────────────────────────

const first = ["Rina", "Tom", "Aiko", "Luis", "Mei", "Omar", "Sara", "Ivan", "Nadia", "Kofi"];
const last = ["Putri", "Smith", "Tanaka", "Garcia", "Lin", "Haddad", "Berg", "Petrov", "Rahman", "Mensah"];
const customerIds = Array.from({ length: 150 }, () => new ObjectId());
db.customers.insertMany(customerIds.map((_id, idx) => {
  const i = idx + 1;
  return {
    _id,
    email: `fan${i}@example.test`,
    name: pick(first, i) + " " + pick(last, Math.floor(i / 10)),
    country: pick(["ID", "US", "JP", "BR", "SG", "DE", "NG", "AU"], i),
    marketing: i % 3 === 0,
    created_at: at("2024-01-01T00:00:00Z", i * 17 * 3600 * 1000),
    ...(i % 4 === 0 ? { phone: "+62-800-" + String(i).padStart(4, "0") } : {}),
  };
}));
db.customers.createIndex({ email: 1 }, { unique: true });

const products = [
  { sku: "PLU-001", name: "Capy plush, small",       price: Decimal128("12.99"), stock: NumberInt(140),  active: true,  dimensions: { w: 15, h: 12, d: 20, unit: "cm" }, tags: ["plush", "kids"] },
  { sku: "PLU-002", name: "Capy plush, huge",        price: Decimal128("59.00"), stock: NumberInt(8),    active: true,  dimensions: { w: 60, h: 45, d: 80, unit: "cm" }, tags: ["plush"] },
  { sku: "MUG-001", name: 'Mug "Ok I pull up"',      price: Decimal128("9.50"),  stock: NumberInt(55),   active: true,  tags: ["kitchen"] },
  { sku: "TEE-001", name: "T-shirt, capy in onsen",  price: Decimal128("19.99"), stock: NumberInt(0),    active: true,  sizes: ["S", "M", "L", "XL"] },
  { sku: "TEE-002", name: "T-shirt, retired design", price: Decimal128("14.99"), stock: NumberInt(12),   active: false, sizes: ["M"], tags: ["apparel", "clearance"] },
  { sku: "STK-001", name: "Sticker pack",            price: Decimal128("3.25"),  stock: NumberInt(1200), active: true,  tags: [] },
  { sku: "BOK-001", name: "Book: A Year of Naps",    price: Decimal128("24.00"), stock: NumberInt(30),   active: true,  pages: 212 },
  { sku: "GFT-000", name: "Gift card",               price: Decimal128("0.00"),  stock: NumberInt(9999), active: true,  digital: true },
];
const productIds = db.products.insertMany(products).insertedIds;
db.products.createIndex({ sku: 1 }, { unique: true });

// 400 orders with embedded items and a denormalised customer.
const statuses = ["cart", "paid", "shipped", "delivered", "refunded"];
const orders = [];
for (let i = 1; i <= 400; i++) {
  const items = [];
  for (let n = 1; n <= 1 + (i % 3); n++) {
    const p = (i * n) % 8;
    if (items.some((it) => it.sku === products[p].sku)) continue;
    items.push({ product_id: productIds[p], sku: products[p].sku, qty: NumberInt(1 + ((i * (p + 1)) % 4)), unit_price: products[p].price });
  }
  const c = (i * 7) % 150;
  const placed = at("2025-02-01T03:00:00Z", i * 433 * 60 * 1000);
  orders.push({
    order_no: NumberLong(String(1000000000 + i)),
    customer: { _id: customerIds[c], email: `fan${c + 1}@example.test` },
    status: pick(statuses, i),
    placed_at: placed,
    ...(i % 5 === 2 || i % 5 === 3 ? { shipped_at: new Date(placed.getTime() + 2 * day) } : {}),
    items,
    address: { city: pick(["Jakarta", "Austin", "Osaka", "Recife", "Singapore"], i), zip: String((i * 37) % 99999).padStart(5, "0") },
  });
}
db.orders.insertMany(orders);
db.orders.createIndex({ "customer._id": 1, placed_at: -1 });
db.orders.createIndex({ order_no: 1 }, { unique: true });
db.orders.createIndex({ status: 1 }, { partialFilterExpression: { status: { $in: ["paid", "shipped"] } } });

db.adoptions.insertMany(Array.from({ length: 90 }, (_, idx) => {
  const i = idx + 1;
  return {
    customer_id: customerIds[(i * 13) % 150],
    capybara_id: capyIds[(i * 11) % 60],
    tier: pick(["bronze", "silver", "gold"], i),
    monthly: Decimal128(String(5 + (i % 3) * 10)),
    since: at("2024-03-01", i * 3 * day),
  };
}));

// ────────────────────────────────── lab ──────────────────────────────────

// Every BSON type. Row "normal", row "falsy", row "nulls", then extremes.
db.type_zoo.insertMany([
  {
    label: "normal",
    double: 3.14, int32: NumberInt(42), int64: NumberLong("9007199254740993"), decimal: Decimal128("12345.6789"),
    string: "Capybaras are the largest living rodents.", bool: true, date: ISODate("2024-02-29T13:37:00Z"),
    objectId: ObjectId("65e0a1b2c3d4e5f601234567"), uuid: UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
    binary: BinData(0, "3q2+7w=="), md5: BinData(5, "1B2M2Y8AsgTpgAmY7PhCfg=="),
    regex: /^capy.*bara$/i, timestamp: Timestamp({ t: 1709213820, i: 1 }), code: Code("function () { return 'nap'; }"),
    object: { a: 1, b: [1, 2, 3] }, array: [1, "two", { three: 3 }, [4]], minKey: MinKey(), maxKey: MaxKey(),
  },
  {
    label: "falsy",
    double: 0.0, int32: NumberInt(0), int64: NumberLong("0"), decimal: Decimal128("0"),
    string: "", bool: false, date: new Date(0),
    objectId: ObjectId("000000000000000000000000"), uuid: UUID("00000000-0000-0000-0000-000000000000"),
    binary: BinData(0, ""), object: {}, array: [], regex: /(?:)/, timestamp: Timestamp({ t: 0, i: 0 }),
  },
  {
    label: "nulls",
    double: null, int32: null, int64: null, decimal: null, string: null, bool: null, date: null, object: null, array: [null],
  },
  {
    label: "extreme",
    double: Infinity, int32: NumberInt(2147483647), int64: NumberLong("9223372036854775807"), decimal: Decimal128("9.999999999999999999999999999999999E+6144"),
    string: "Long text so the cell has to truncate. ".repeat(150), bool: true, date: ISODate("9999-12-31T23:59:59.999Z"),
    binary: BinData(0, "/".repeat(684)), object: { l1: { l2: { l3: { l4: { l5: { l6: { deep: true } } } } } } },
    array: Array.from({ length: 200 }, (_, k) => k), timestamp: Timestamp({ t: 4294967295, i: 4294967295 }),
    big_number_in_string: "12345678901234567890",
  },
  {
    label: "negative",
    double: -Infinity, int32: NumberInt(-2147483648), int64: NumberLong("-9223372036854775808"), decimal: Decimal128("-0.000000001"),
    string: "-", bool: false, date: ISODate("1900-01-01T00:00:00Z"), nan: NaN, negative_zero: -0.0,
  },
  {
    label: "unicode",
    string: "Tab\there, newline\nhere, emoji 🦫🍊, RTL مرحبا, CJK カピバラ, zero-width​space",
    "🦫": "カピバラ", "field with spaces": 1, "dotted.name": "allowed since 5.0", nested: { "$dollar": "allowed since 5.0" },
    object: { quote: 'he said "hi"', slash: "a\\b" },
  },
]);

// Odd _id types: editing keys on _id, so each kind must round-trip.
db.odd_ids.insertMany([
  { _id: "string-id", note: "string _id" },
  { _id: NumberInt(42), note: "int32 _id" },
  { _id: NumberLong("9007199254740993"), note: "int64 _id past 2^53" },
  { _id: UUID("b1e2c3d4-0000-4000-8000-000000000001"), note: "UUID _id" },
  { _id: { region: "ID", seq: 1 }, note: "compound object _id" },
  { _id: ISODate("2025-01-01T00:00:00Z"), note: "date _id" },
  { _id: 3.5, note: "double _id" },
]);

// 20,000 documents: paging, the pager estimate and console row limits.
const kinds = ["login", "logout", "feed", "bath", "nap", "escape", "photo", "purchase"];
const events = [];
for (let i = 1; i <= 20000; i++) {
  const doc = {
    happened_at: at("2025-06-01T00:00:00Z", i * 41 * 1000),
    kind: pick(kinds, i),
    ok: i % 13 !== 0,
  };
  if (i % 11 !== 0) doc.actor = "user_" + (i % 333);
  if (i % 17 !== 0) doc.latency_ms = NumberInt((i * 31) % 2500);
  if (i % 5 !== 0) doc.payload = { seq: i, tags: ["t" + (i % 4), "t" + (i % 7)] };
  events.push(doc);
}
insertInBatches(db.events, events);
db.events.createIndex({ happened_at: 1 });
db.events.createIndex({ kind: 1, ok: 1 });

// 40 top-level fields: horizontal scroll in the table view.
db.wide_docs.insertMany(Array.from({ length: 25 }, (_, r) => {
  const d = {};
  for (let c = 1; c <= 40; c++) d["field_" + String(c).padStart(2, "0")] = `r${r + 1}c${c}`;
  return d;
}));

// Throwaway documents for the write guard: deleteMany, updateMany, drop, renameCollection.
db.scratch.insertMany(Array.from({ length: 250 }, (_, k) => ({ label: "doc " + (k + 1), n: NumberInt(k + 1) })));

// Empty collection: Add document is offered here.
db.createCollection("empty_coll");

// Schema validation: an invalid insert or edit must surface the server's error.
db.createCollection("validated", {
  validator: { $jsonSchema: {
    bsonType: "object", required: ["name", "weight_kg"],
    properties: { name: { bsonType: "string", minLength: 1 }, weight_kg: { bsonType: ["double", "decimal", "int"], minimum: 1 } },
  } },
  validationAction: "error",
});
db.validated.insertOne({ name: "Bean", weight_kg: 42.5 });

// Capped collection (Info shows it as capped).
db.createCollection("recent_logs", { capped: true, size: 1024 * 1024, max: 500 });
db.recent_logs.insertMany(Array.from({ length: 600 }, (_, k) => ({ at: at("2025-06-01T00:00:00Z", k * 1000), msg: "log line " + k })));

// TTL index. Dates are far in the future, so nothing expires.
db.sessions.insertMany(Array.from({ length: 20 }, (_, k) => ({ user: "user_" + k, expire_at: ISODate("2099-01-01T00:00:00Z") })));
db.sessions.createIndex({ expire_at: 1 }, { expireAfterSeconds: 0 });

// Time series collection (Info shows its type).
db.createCollection("pool_temps", { timeseries: { timeField: "taken_at", metaField: "pool", granularity: "hours" } });
db.pool_temps.insertMany(Array.from({ length: 2000 }, (_, k) => ({
  taken_at: at("2025-01-01T00:00:00Z", k * 3600 * 1000),
  pool: { name: pick(["Mud Spa", "Hot Springs", "Lazy River"], k) },
  celsius: 20 + ((k * 7) % 150) / 10,
})));

// View over capybaras with their habitat and feeding count.
db.createView("v_capybara_summary", "capybaras", [
  { $lookup: { from: "habitats", localField: "habitat_id", foreignField: "_id", as: "habitat" } },
  { $lookup: { from: "feedings", localField: "_id", foreignField: "capybara_id", as: "f" } },
  { $project: { name: 1, mood: 1, habitat: { $first: "$habitat.name" }, feedings: { $size: "$f" } } },
]);

// A second database for the database list.
const archive = db.getSiblingDB("capy_archive");
archive.old_capybaras.insertMany([
  { name: "Elder Bean", retired_on: ISODate("2018-05-01"), reason: "Moved to a bigger pond" },
  { name: "Grandma Mochi", retired_on: ISODate("2019-11-20"), reason: "Retired from zoomies" },
]);

print("capy:");
db.getCollectionNames().filter((n) => !n.startsWith("system.")).sort().forEach((n) => {
  const info = db.getCollectionInfos({ name: n })[0];
  print("  " + n.padEnd(20) + (info.type === "view" ? "view" : db.getCollection(n).estimatedDocumentCount()));
});
print("capy_archive: old_capybaras " + archive.old_capybaras.estimatedDocumentCount());
