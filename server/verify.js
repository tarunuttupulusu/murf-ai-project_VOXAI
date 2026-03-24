require('dotenv').config({ path: 'c:/Users/uttup/OneDrive/Desktop/NIAT MURF HACKATHON/PREVIEW 1/server/.env' });
const axios = require('axios');
const twilio = require('twilio');
const OpenAI = require('openai');
const fs = require('fs');

async function testAll() {
  const results = {};
  
  // 1. OpenAI
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openai.models.list();
    results.OpenAI = 'Working';
  } catch (e) {
    results.OpenAI = 'Error: ' + e.message;
  }

  // 2. Murf AI
  try {
    await axios.get('https://api.murf.ai/v1/speech/voices', {
      headers: { 'api-key': process.env.MURF_API_KEY }
    });
    results.MurfAI = 'Working';
  } catch (e) {
    results.MurfAI = 'Error: ' + (e.response?.data?.message || e.message);
  }

  // 3. Twilio
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    results.Twilio = 'Working';
  } catch (e) {
    results.Twilio = 'Error: ' + e.message;
  }

  // 4. Google Translate
  try {
    await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      { q: 'Hello', target: 'es', format: 'text' }
    );
    results.GoogleTranslate = 'Working';
  } catch (e) {
    results.GoogleTranslate = 'Error: ' + (e.response?.data?.error?.message || e.message);
  }

  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
}

testAll();
