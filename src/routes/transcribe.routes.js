// User Story Architecture Trace — transcribe.routes.js

const express = require('express');
const multer = require('multer');
const { handleTranscribe } = require('../controllers/transcribe.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/transcribe', upload.single('audio'), handleTranscribe);

module.exports = router;
