const express = require("express");
const { getDb } = require("../config/mongo");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const db = getDb();

    if (!db) {
      return res.json({
        ok: true,
        message: "MongoDB is not connected yet.",
        data: [],
        nextStep: "Set MONGODB_URI, switch MONGODB_AUTOCONNECT=true, and restart the server.",
      });
    }

    const items = await db
      .collection("sample_messages")
      .find({})
      .limit(10)
      .toArray();

    return res.json({
      ok: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/seed", async (_req, res, next) => {
  try {
    const db = getDb();

    if (!db) {
      return res.status(503).json({
        ok: false,
        message: "MongoDB is not connected.",
      });
    }

    const payload = {
      text: "This is starter filler data for MongoDB integration.",
      createdAt: new Date(),
      source: "seed-endpoint",
    };

    const result = await db.collection("sample_messages").insertOne(payload);

    return res.status(201).json({
      ok: true,
      insertedId: result.insertedId,
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
