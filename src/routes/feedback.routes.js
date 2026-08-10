// User Story Architecture Trace — feedback.routes.js

const express = require("express");
const feedbackController = require("../controllers/feedback.controller");

const router = express.Router();

// #307 - As a customer, I want to provide feedback manually so that I can share my experience with the service.
router.post("/feedback", feedbackController.createFeedback);
router.get("/feedback/orders", feedbackController.getOrderFeedbacks);
router.get("/feedback/rating/:menuItemId", feedbackController.getAverageRating);

module.exports = router;