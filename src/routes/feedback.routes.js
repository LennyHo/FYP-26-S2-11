const express = require("express");
const feedbackController = require("../controllers/feedback.controller");

const router = express.Router();

router.post("/feedback", feedbackController.createFeedback);
router.get("/feedback/rating/:menuItemId", feedbackController.getAverageRating);

module.exports = router;