// Seeds an isolated load-test database so k6 runs never touch real data.
//
// Reference collections (menu items, stores, vouchers) are COPIED READ-ONLY out
// of the source DB; every write goes to TARGET_DB and nowhere else. A guard
// aborts the script if TARGET_DB is ever set to the source DB.
//
// Run:  node load-tests/seed-loadtest-db.js
//
// Cleanup afterwards:  node load-tests/seed-loadtest-db.js --drop

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config();
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const URI = process.env.MONGODB_URI;
const SOURCE_DB = process.env.MONGODB_DB_NAME || "driptea_vs1";
const TARGET_DB = process.env.LOADTEST_DB_NAME || "driptea_loadtest";
const TEST_USER_COUNT = Number(process.env.LOADTEST_USERS || 100);

// Collections cloned from the source DB. Read-only on the source side.
const REFERENCE_COLLECTIONS = ["menu_items", "stores", "vouchers"];

// == Safety guard ==
if (!URI) throw new Error("MONGODB_URI is missing in .env");
if (TARGET_DB === SOURCE_DB) {
  throw new Error(
    `Refusing to run: target DB "${TARGET_DB}" is the same as source DB "${SOURCE_DB}".`
  );
}

function createPasswordRecord(password) {
  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto
    .pbkdf2Sync(password, passwordSalt, 310000, 32, "sha256")
    .toString("hex");
  return { passwordHash, passwordSalt };
}

async function main() {
  const drop = process.argv.includes("--drop");

  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 20000 });
  await client.connect();

  const source = client.db(SOURCE_DB);
  const target = client.db(TARGET_DB);

  if (target.databaseName === source.databaseName) {
    throw new Error("Guard tripped: refusing to write to the source database.");
  }

  if (drop) {
    await target.dropDatabase();
    console.log(`Dropped load-test database "${TARGET_DB}".`);
    await client.close();
    return;
  }

  console.log(`Source (read-only): ${SOURCE_DB}`);
  console.log(`Target (writes):    ${TARGET_DB}\n`);

  // == Clone reference collections ==
  const existing = (await source.listCollections().toArray()).map((c) => c.name);

  for (const name of REFERENCE_COLLECTIONS) {
    if (!existing.includes(name)) {
      console.log(`  skip ${name} (not present in source)`);
      continue;
    }
    const docs = await source.collection(name).find({}).toArray(); // read-only
    await target.collection(name).deleteMany({});
    if (docs.length) await target.collection(name).insertMany(docs);
    console.log(`  copied ${name.padEnd(12)} ${docs.length} docs`);
  }

  // == Create synthetic test customers (target DB only) ==
  const users = target.collection("users");
  await users.deleteMany({ email: /^loadtest\+/ });

  const now = new Date();
  const testUsers = Array.from({ length: TEST_USER_COUNT }, (_, i) => ({
    fullName: `Load Test Customer ${i + 1}`,
    email: `loadtest+${i + 1}@example.com`,
    role: "customer",
    status: "active",
    profilePic: "",
    addresses: [],
    storeId: null,
    storeCode: null,
    ...createPasswordRecord("Password@123"),
    createdAt: now,
    updatedAt: now,
  }));

  await users.insertMany(testUsers);
  console.log(`  created users        ${testUsers.length} test customers`);

  // Write the user ids out so the k6 script can send real userId values.
  const inserted = await users
    .find({ email: /^loadtest\+/ }, { projection: { _id: 1 } })
    .toArray();

  require("fs").writeFileSync(
    require("path").join(__dirname, "loadtest-users.json"),
    JSON.stringify(inserted.map((u) => String(u._id)), null, 2)
  );
  console.log(`\nWrote load-tests/loadtest-users.json (${inserted.length} ids)`);
  console.log(`\nStart the test server with:`);
  console.log(`  MONGODB_DB_NAME=${TARGET_DB} node server.js`);

  await client.close();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
