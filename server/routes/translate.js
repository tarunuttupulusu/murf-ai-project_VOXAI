const express = require('express');
const router = express.Router();
const axios = require('axios');

// Translation via Google Translate API
router.post('/', async (req, res) => {
  const { text, sourceLang = 'auto', targetLang = 'hi' } = req.body;
  if (!process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY === 'your_google_translate_api_key_here') {
    // Fallback: use free MyMemory API
    try {
      const pair = sourceLang === 'auto' ? `en|${targetLang}` : `${sourceLang}|${targetLang}`;
      const response = await axios.get(`https://api.mymemory.translated.net/get`, {
        params: { q: text, langpair: pair }
      });
      return res.json({
        translatedText: response.data.responseData.translatedText,
        detectedLang: sourceLang,
        provider: 'MyMemory (free)'
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      { q: text, source: sourceLang === 'auto' ? undefined : sourceLang, target: targetLang, format: 'text' }
    );
    const result = response.data.data.translations[0];
    res.json({ translatedText: result.translatedText, detectedLang: result.detectedSourceLanguage || sourceLang });
  } catch (err) {
    try {
      const pair = sourceLang === 'auto' ? `en|${targetLang}` : `${sourceLang}|${targetLang}`;
      const response = await axios.get(`https://api.mymemory.translated.net/get`, { params: { q: text, langpair: pair } });
      return res.json({
        translatedText: response.data.responseData.translatedText,
        detectedLang: sourceLang,
        provider: 'MyMemory (Fallback)'
      });
    } catch (fallbackErr) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
});

module.exports = router;
