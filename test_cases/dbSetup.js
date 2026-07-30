// Global test database setup — starts an in-memory MongoDB before the whole
// suite runs and tears it down after. This is what successPathTesting.js needs
// to exercise real success paths (a real payment going through, a real order
// being found) instead of just validation-failure paths. Every other test file
// still runs exactly as before — they never touch this connection.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

before(async function () {
  this.timeout(60000); // first run downloads the MongoDB binary — can take a while
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "driptea_test" });
});

after(async function () {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});
