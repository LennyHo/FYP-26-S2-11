const mongoose = require("mongoose");
const { env } = require("./env");

let database;
let connectionPromise;

async function connectMongo() {
  if (!env.mongodbUri) {
    console.warn("MongoDB connection skipped because MONGODB_URI is not set.");
    return null;
  }

  if (database) {
    return database;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongodbUri, {
      dbName: env.mongodbDbName,
      serverSelectionTimeoutMS: 5000,
    }).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;

  database = mongoose.connection.db;

  console.log(`Connected to MongoDB database "${env.mongodbDbName}" using Mongoose.`);

  return database;
}

function getDb() {
  return database;
}

async function closeMongo() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  database = null;
  connectionPromise = null;
}

module.exports = {
  closeMongo,
  connectMongo,
  getDb,
};
