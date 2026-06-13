const express = require("express");
const chatbotController = require("../controllers/chatbot.controller");

const router = express.Router();

// #25  - As a customer, I want to chat with the AI chatbot so that I can get help with ordering and menu questions.
// #26  - As a customer, I want to ask a chatbot to navigate throughout the website so that I can look for what I need.
// #27  - As a customer, I want to search for beverages using the AI chatbot so that I can find what I want quickly.
// #28  - As a customer, I want to track my order status so that I know when my drink will be ready.
// #29  - As a customer, I want the chatbot to inform me when my chosen drink has a high sugar level so that I can reconsider my selection.
// #31  - As a customer, I want the chatbot to show me the nutritional grading of each beverage so that I can choose the suitable option.
// #32  - As a customer, I want to get the recommendations from chatbot so that I can complete my order.
// #197 - As a customer, I want to speak to the chatbot so that I can interact conveniently.
// #198 - As a customer, I want to browse my purchase history through the chatbot so that I can review my previous orders conveniently.
// #199 - As a customer, I want to add beverages into my cart through the chatbot so that I can prepare my order conveniently.
// #200 - As a customer, I want to view my cart through the chatbot so that I can review my selected beverages before checkout.
// #201 - As a customer, I want to edit items in my cart through the chatbot so that I can modify my order before payment.
// #203 - As a customer, I want to track my order status through the chatbot so that I know when my drink will be ready.
router.post("/chat", chatbotController.handleChat);

module.exports = router;
