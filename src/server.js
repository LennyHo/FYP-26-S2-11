const { app } = require("./app");
const { env } = require("./config/env");
const { closeMongo, connectMongo } = require("./config/mongo");

async function startServer() {
  try {
    if (env.mongodbAutoconnect) {
      await connectMongo();
    } else {
      console.log("MongoDB autoconnect is disabled. Server will start without a DB connection.");
    }

    const server = app.listen(env.port, () => {
      console.log(`${env.appName} listening on port ${env.port}`);
    });

    async function shutdown(signal) {
      console.log(`${signal} received. Shutting down gracefully.`);
      server.close(async () => {
        await closeMongo();
        process.exit(0);
      });
    }

    process.on("SIGINT", () => {
      shutdown("SIGINT").catch((error) => {
        console.error("Shutdown failed:", error);
        process.exit(1);
      });
    });

    process.on("SIGTERM", () => {
      shutdown("SIGTERM").catch((error) => {
        console.error("Shutdown failed:", error);
        process.exit(1);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
