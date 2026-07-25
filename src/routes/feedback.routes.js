// User Story Architecture Trace — feedback.routes.js
//
// #307 Provide Feedback
//      View: FeedbackModal.tsx → Route: feedback.routes.js (this file) → Ctrl: feedback.controller.js  → Model: feedback.model.js
//
// #318 Get Customer Feedback (Store Staff)
//      View: FeedbackPrompt.tsx → Route: feedback.routes.js (this file) → Ctrl: feedback.controller.js  → Model: feedback.model.js

const express = require("express");
const feedbackController = require("../controllers/feedback.controller");

const router = express.Router();

router.post("/feedback", feedbackController.createFeedback);
router.get("/feedback/orders", feedbackController.getOrderFeedbacks);
router.get("/feedback/rating/:menuItemId", feedbackController.getAverageRating);

module.exports = router;