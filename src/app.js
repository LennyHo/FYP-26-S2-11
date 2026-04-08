const express = require("express");

const healthRoutes = require("./routes/health.routes");
const exampleRoutes = require("./routes/example.routes");
const dialogflowRoutes = require("./routes/dialogflow.routes");

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "Backend is running.",
    docs: {
      health: "/api/health",
      examples: "/api/examples",
      seedExample: "POST /api/examples/seed",
    },
  });
});


app.use("/api/health", healthRoutes);
app.use("/api/examples", exampleRoutes);
app.use("/api/dialogflow", dialogflowRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    ok: false,
    message: "Internal server error.",
  });
});

module.exports = { app };
