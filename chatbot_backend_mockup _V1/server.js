const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force use of Google DNS

require('dotenv').config(); // Loads your .env variables
const express = require('express');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// 1. Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Successfully connected to MongoDB Atlas"))
    .catch(err => console.error("❌ Connection error:", err));

// 2. Define the Schema (The data structure)
const articleSchema = new mongoose.Schema({
    userId: { type: String, default: "anonymous" },
    text: { type: String, required: true },
    label: { type: String, default: "Pending" },
    confidence: { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});

const Article = mongoose.model('Article', articleSchema);

// 3. The API Route for your Chatbot
app.post('/check-article', async (req, res) => {
    const startTime = performance.now();
    const { text, userId } = req.body;

    let result = "Real"; // Default to real
    const fakeKeywords = ["milo", "gold", "voucher", "free", "win", "scientists found"];
    
    // If any fake keyword is in the text, set result to Fake
    if (fakeKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
        result = "Fake";
    }

    const mockConfidence = 0.92;
    const duration = (performance.now() - startTime).toFixed(2);

    try {
        const newEntry = new Article({
            userId: userId || "anonymous",
            text: text,
            label: randomResult,
            confidence: mockConfidence,
            processingTimeMs: parseFloat(duration)
        });

        await newEntry.save();
        console.log("✅ Successfully saved to MongoDB Atlas!"); 
        res.json({ status: "success", result: randomResult });

    } catch (err) {
        // THIS LINE IS THE KEY: It will show the real error in your terminal
        console.error("❌ MDB SAVE ERROR:", err.message); 
        res.status(500).json({ error: "Failed to save to database", details: err.message });
    }
});

// Door 2: Getting History (The new "Webhook")
app.get('/get-user-history', async (req, res) => {
    try {
        const history = await Article.find({ userId: req.query.userId });
        res.json({ history });
    } catch (err) {
        res.status(500).send("Error");
    }
});

// This line MUST be at the end of your server.js file
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running and listening on http://localhost:${PORT}`);
});