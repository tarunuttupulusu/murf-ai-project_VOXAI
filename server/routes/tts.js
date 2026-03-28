const express = require('express');
const router = express.Router();
const axios = require('axios');

// Murf AI Text-to-Speech
router.post('/murf', async (req, res) => {
  const { text, voiceId = 'en-US-natalie', style = 'Conversational', rate = 0, pitch = 0 } = req.body;
  if (!process.env.MURF_API_KEY || process.env.MURF_API_KEY === 'your_murf_api_key_here') {
    return res.status(400).json({ error: 'MURF_API_KEY not configured', needsKey: 'MURF_API_KEY' });
  }
  try {
    const response = await axios.post('https://api.murf.ai/v1/speech/generate', {
      text, voiceId, style,
      audioDuration: 0,
      modelVersion: 'GEN2',
      encodeAsBase64: false,
      variation: 1,
      multiNativeLocale: null,
      audioBitRate: 'B_320',
      audioFormat: 'MP3',
      pitch, rate
    }, {
      headers: { 'api-key': process.env.MURF_API_KEY, 'Content-Type': 'application/json' }
    });
    console.log('✅ Murf Voice Generated:', response.data.audioFile);
    res.json({ audioUrl: response.data.audioFile, duration: response.data.audioDuration });
  } catch (err) {
    console.error('❌ Murf API Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Fallback: Browser Speech Synthesis signal
router.post('/browser', (req, res) => {
  const { text, lang = 'en' } = req.body;
  res.json({ text, lang, method: 'browser-tts' });
});

module.exports = router;
