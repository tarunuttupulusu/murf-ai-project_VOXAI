const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../.env');

// Check which keys are configured
router.get('/status', (req, res) => {
  const keys = {
    MURF_API_KEY: process.env.MURF_API_KEY && process.env.MURF_API_KEY !== 'your_murf_api_key_here',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid_here',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN !== 'your_twilio_auth_token_here',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_PHONE_NUMBER !== 'your_twilio_phone_number_here',
    GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY && process.env.GOOGLE_TRANSLATE_API_KEY !== 'your_google_translate_api_key_here',
  };
  res.json(keys);
});

// Save API key to .env
router.post('/key', (req, res) => {
  const { key, value } = req.body;
  const allowedKeys = ['MURF_API_KEY', 'OPENAI_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'GOOGLE_TRANSLATE_API_KEY'];
  if (!allowedKeys.includes(key)) return res.status(400).json({ error: 'Invalid key name' });

  try {
    let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
    fs.writeFileSync(ENV_PATH, envContent);
    process.env[key] = value;
    res.json({ success: true, key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
