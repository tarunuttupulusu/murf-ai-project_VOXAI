const express = require('express');
const router = express.Router();
const axios = require('axios');

const VOICE_PRESETS = {
  deep: { voiceId: 'en-US-ken', style: 'Promo', pitch: -15, rate: -10 },
  female: { voiceId: 'en-US-natalie', style: 'Conversational', pitch: 5, rate: 0 },
  robot: { voiceId: 'en-US-miles', style: 'Newscast', pitch: -20, rate: 15 },
  cartoon: { voiceId: 'en-US-clive', style: 'Excited', pitch: 20, rate: 20 },
  professional: { voiceId: 'en-US-terrell', style: 'Promo', pitch: 0, rate: -5 },
};

// Generate voice from text prompt with customization
router.post('/generate', async (req, res) => {
  const { text, preset = 'female', pitch = 0, rate = 0, style } = req.body;

  if (!process.env.MURF_API_KEY || process.env.MURF_API_KEY === 'your_murf_api_key_here') {
    return res.status(400).json({
      error: 'MURF_API_KEY not configured',
      needsKey: 'MURF_API_KEY',
      fallback: 'browser'
    });
  }

  const base = VOICE_PRESETS[preset] || VOICE_PRESETS.female;
  try {
    const response = await axios.post('https://api.murf.ai/v1/speech/generate', {
      text,
      voiceId: base.voiceId,
      style: style || base.style,
      audioDuration: 0,
      modelVersion: 'GEN2',
      encodeAsBase64: false,
      variation: 1,
      audioFormat: 'MP3',
      pitch: base.pitch + Number(pitch),
      rate: base.rate + Number(rate)
    }, {
      headers: { 'api-key': process.env.MURF_API_KEY, 'Content-Type': 'application/json' }
    });
    res.json({ audioUrl: response.data.audioFile });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// List available voices
router.get('/presets', (req, res) => {
  res.json(Object.keys(VOICE_PRESETS).map(key => ({
    id: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    ...VOICE_PRESETS[key]
  })));
});

module.exports = router;
