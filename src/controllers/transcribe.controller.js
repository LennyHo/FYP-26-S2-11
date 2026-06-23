// User Story #197 — Voice Input: ElevenLabs Scribe speech-to-text with auto language detection

async function handleTranscribe(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ElevenLabs API key not configured' });

  try {
    // Use native FormData + Blob (Node 22 built-ins) — compatible with native fetch
    const audioBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype || 'audio/webm',
    });

    const form = new FormData();
    form.append('file', audioBlob, req.file.originalname || 'recording.webm');
    form.append('model_id', 'scribe_v1');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Transcribe] ElevenLabs error:', response.status, err);
      return res.status(response.status).json({ error: 'Transcription failed', detail: err });
    }

    const result = await response.json();
    res.json({
      text: result.text || '',
      language: result.language_code || 'en',
    });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    res.status(500).json({ error: 'Internal transcription error' });
  }
}

module.exports = { handleTranscribe };
