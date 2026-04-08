// Express route for Dialogflow CX webhook
const express = require('express');
const router = express.Router();
const { detectIntent } = require('../dialogflowCX');

router.post('/dialogflow-cx/webhook', async (req, res) => {
    const { text, sessionId } = req.body;
    try {
        const response = await detectIntent(text, sessionId);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;