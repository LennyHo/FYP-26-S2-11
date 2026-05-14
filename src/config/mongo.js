const { MongoClient } = require("mongodb");
const { env } = require("./env");

let client;
let database;

async function connectMongo() {
  if (!env.mongodbUri) {
    console.warn("MongoDB connection skipped because MONGODB_URI is not set.");
    return null;
  }

  if (database) {
    return database;
  }

  // done by "HDC" - fail faster when MongoDB is not reachable so UI requests do not hang.
  // client = new MongoClient(env.mongodbUri);
  client = new MongoClient(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  // end done by "HDC"
  await client.connect();
  database = client.db(env.mongodbDbName);

  console.log(`Connected to MongoDB database "${env.mongodbDbName}".`);

  return database;
}

function getDb() {
  return database;
}

async function closeMongo() {
  if (!client) {
    return;
  }

  await client.close();
  client = null;
  database = null;
}

module.exports = {
  closeMongo,
  connectMongo,
  getDb,
};
