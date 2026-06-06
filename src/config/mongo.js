const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "driptea_vs1";

  if (!uri) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`Connected to MongoDB database "${dbName}"`);

  try {
    await mongoose.connection.db.collection('chatbot_sessions').dropIndex('sessionId_1');
    console.log('[Mongo] Dropped stale sessionId_1 index from chatbot_sessions');
  } catch (err) {
    if (err.codeName !== 'IndexNotFound') {
      console.warn('[Mongo] Could not drop stale sessionId_1 index:', err.message);
    }
  }
}

module.exports = { connectMongo };