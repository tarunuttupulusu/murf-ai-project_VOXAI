const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const History = require('../models/History');

const VOICE_PRESETS = {
  deep: { voiceId: 'en-IN-amit', style: 'Conversational', pitch: -10, rate: -5 },
  female: { voiceId: 'en-IN-ekta', style: 'Conversational', pitch: 0, rate: 0 },
  robot: { voiceId: 'en-US-miles', style: 'Newscast', pitch: -20, rate: 15 },
  cartoon: { voiceId: 'en-US-clive', style: 'Excited', pitch: 20, rate: 20 },
  professional: { voiceId: 'en-IN-amit', style: 'Conversational', pitch: 0, rate: 0 },
};

// Generate voice from text prompt with customization
router.post('/generate', async (req, res) => {
  const { text, voiceId, style, pitch = 0, rate = 0, preset = 'female' } = req.body;

  if (!process.env.MURF_API_KEY || process.env.MURF_API_KEY === 'your_murf_api_key_here') {
    return res.status(400).json({
      error: 'MURF_API_KEY not configured',
      needsKey: 'MURF_API_KEY',
      fallback: 'browser'
    });
  }

  const base = VOICE_PRESETS[preset] || VOICE_PRESETS.female;
  const targetVoice = voiceId || base.voiceId;
  const targetStyle = style || base.style;

  try {
    const response = await axios.post('https://api.murf.ai/v1/speech/generate', {
      text,
      voiceId: targetVoice,
      style: targetStyle,
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
    
    // Save to projects history
    if (mongoose.connection.readyState === 1) {
      try {
        const history = new History({
          type: 'voice',
          input: text,
          output: response.data.audioFile,
          language: targetVoice + ' (' + targetStyle + ')',
        });
        await history.save();
      } catch (dbErr) {
        console.error('⚠️ Could not save history to MongoDB:', dbErr.message);
      }
    } else {
      console.log('⚠️ MongoDB offline. Skipping history save to prevent timeout.');
    }

    res.json({ audioUrl: response.data.audioFile });
  } catch (err) {
    console.error('❌ MURF API REJECTION:', err.response?.data || err.message);
    const apiErr = err.response?.data?.message || err.response?.data?.error || JSON.stringify(err.response?.data) || err.message;
    res.status(400).json({ error: `Murf API Error: ${apiErr}` });
  }
});

// Get voice projects history
router.get('/projects', async (req, res) => {
  try {
    const projects = await History.find({ type: 'voice' }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available voices dynamically from Murf
router.get('/available', async (req, res) => {
  try {
    const response = await axios.get('https://api.murf.ai/v1/speech/voices', {
      headers: { 'api-key': process.env.MURF_API_KEY }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Murf voices' });
  }
});

module.exports = router;
