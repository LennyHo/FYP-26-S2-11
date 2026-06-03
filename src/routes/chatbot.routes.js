const express = require("express");
const chatbotController = require("../controllers/chatbot.controller");

const router = express.Router();

router.post("/chat", chatbotController.handleChat);

module.exports = router;