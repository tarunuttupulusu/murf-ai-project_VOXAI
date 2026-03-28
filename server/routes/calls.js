const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

router.post('/make', async (req, res) => {
  const { to, script, voiceUrl } = req.body;

  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_account_sid_here') {
    return res.status(400).json({
      error: 'Twilio credentials not configured',
      needsKey: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']
    });
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // TwiML to play Murf audio or fallback to Say
    let twiml;
    if (voiceUrl) {
      twiml = `<Response><Play>${voiceUrl}</Play></Response>`;
    } else {
      twiml = `<Response><Say voice="Polly.Joanna">${script || 'Hello, this is an automated call from VoxAI. Have a great day!'}</Say></Response>`;
    }

    const call = await client.calls.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml
    });

    console.log(`✅ Call initiated! SID: ${call.sid}`);
    res.json({ callSid: call.sid, status: call.status, to: call.to });
  } catch (err) {
    console.error('❌ Twilio Call Error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ─── Live AI Voice Assistant ────────────────────────────────────────────────
// 1. Kick off the call
router.post('/voice-assistant/start', async (req, res) => {
  const { to, language = 'en' } = req.body;
  const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
  
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const call = await client.calls.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${baseUrl}/api/calls/voice-assistant/intro?lang=${language}`
    });
    res.json({ success: true, callSid: call.sid });
  } catch (err) {
    console.error('❌ Twilio Start Error:', JSON.stringify(err, null, 2));
    res.status(500).json({ error: err.message, details: err });
  }
});

// 2. Initial Greeting & First Prompt
router.post('/voice-assistant/intro', async (req, res) => {
  const lang = req.query.lang || 'en';
  const voice = lang === 'te' ? 'te-IN-shobha' : 'en-IN-amit';
  const greet = lang === 'te' 
    ? 'నమస్కారం, నేను వోక్స్ ఏ ఐ సహాయకుడిని. నేను మీకు ఎలా సహాయపడగలను?' 
    : 'Hello, I am your VoxAI voice assistant. How can I help you today?';

  const twiml = new twilio.twiml.VoiceResponse();
  
  try {
    // Murf doesn't support Telugu for this key, skip for 'te'
    if (lang === 'te') {
      throw new Error('Skip Murf for Telugu');
    }
    const murfRes = await axios.post('https://api.murf.ai/v1/speech/generate', {
      text: greet, voiceId: voice, modelVersion: 'GEN2'
    }, { headers: { 'api-key': process.env.MURF_API_KEY } });
    
    twiml.play(murfRes.data.audioFile);
  } catch (e) {
    // For Telugu, Shruti is the standard female voice.
    twiml.say({ voice: 'Polly.Shruti', language: 'te-IN' }, greet);
  }

  const gather = twiml.gather({
    input: 'speech',
    action: `/api/calls/voice-assistant/process?lang=${lang}`,
    language: lang === 'te' ? 'te-IN' : 'en-IN',
    speechTimeout: 'auto'
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// 3. Main Conversation Loop (Process Speech -> Talk Back)
router.post('/voice-assistant/process', async (req, res) => {
  const { SpeechResult } = req.body;
  const lang = req.query.lang || 'en';
  const twiml = new twilio.twiml.VoiceResponse();

  if (!SpeechResult) {
    twiml.say('I didn\'t catch that. Please try again.');
    twiml.redirect(`/api/calls/voice-assistant/intro?lang=${lang}`);
    return res.type('text/xml').send(twiml.toString());
  }

  try {
    // 1. Get AI response from Gemini
    const prompt = `You are a helpful AI assistant. Respond naturally in ${lang === 'te' ? 'Telugu' : 'English'}. The user said: "${SpeechResult}"`;
    const result = await model.generateContent(prompt);
    const aiText = result.response.text().trim();

    // 2. Generate Human-like Audio via Murf
    if (lang === 'te') {
       twiml.say({ voice: 'Polly.Shruti', language: 'te-IN' }, aiText);
    } else {
      const voiceId = 'en-IN-amit';
      const murfRes = await axios.post('https://api.murf.ai/v1/speech/generate', {
        text: aiText, voiceId, modelVersion: 'GEN2'
      }, { headers: { 'api-key': process.env.MURF_API_KEY } });
      twiml.play(murfRes.data.audioFile);
    }
    twiml.gather({
      input: 'speech',
      action: `/api/calls/voice-assistant/process?lang=${lang}`,
      language: lang === 'te' ? 'te-IN' : 'en-IN',
      speechTimeout: 'auto'
    });

  } catch (err) {
    console.error('AI Assistant Error:', err);
    twiml.say('Sorry, I encountered an error. Please continue speaking.');
    twiml.gather({ input: 'speech', action: `/api/calls/voice-assistant/process?lang=${lang}` });
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = router;
