const dotenv = require("dotenv");

dotenv.config();

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

const env = {
  // done by "HDC" - config fallback follows teammates' backend port 5000.
  // port: Number(process.env.PORT) || 4000,
  port: Number(process.env.PORT) || 5000,
  // end done by "HDC"
  nodeEnv: process.env.NODE_ENV || "development",
  appName: process.env.APP_NAME || "FYP-26-S2-11 Backend",
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbDbName: process.env.MONGODB_DB_NAME || "fyp_chatbot",
  mongodbAutoconnect: parseBoolean(process.env.MONGODB_AUTOCONNECT, false),
};

module.exports = { env };
