const express = require("express");
const { env } = require("../config/env");
const { getDb } = require("../config/mongo");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    app: env.appName,
    environment: env.nodeEnv,
    mongodbConnected: Boolean(getDb()),
  });
});

module.exports = router;
