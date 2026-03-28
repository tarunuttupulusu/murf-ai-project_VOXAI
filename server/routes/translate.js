const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require('openai');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// Helper for MyMemory Chunking (Free tier limit is usually 500 chars)
async function translateWithMyMemory(text, pair) {
  const chunks = text.match(/.{1,500}/g) || [text];
  let translatedText = '';
  for (const chunk of chunks) {
    const response = await axios.get(`https://api.mymemory.translated.net/get`, {
      params: { q: chunk, langpair: pair }
    });
    translatedText += response.data.responseData.translatedText;
  }
  return translatedText;
}

// Translation via Google Translate API
router.post('/', async (req, res) => {
  let { text, sourceLang = 'auto', targetLang = 'hi' } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // Safety: Truncate very large text for the translation API (limit 5000 chars)
  const isTruncated = text.length > 5000;
  if (isTruncated) {
    text = text.substring(0, 5000);
  }

  const pair = sourceLang === 'auto' ? `en|${targetLang}` : `${sourceLang}|${targetLang}`;

  if (!process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY.includes('your_')) {
    try {
      const translatedText = await translateWithMyMemory(text, pair);
      return res.json({ translatedText, detectedLang: sourceLang, provider: 'MyMemory (Chunked)' });
    } catch (e) {
      return res.status(500).json({ error: 'MyMemory Error: ' + e.message });
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
      const translatedText = await translateWithMyMemory(text, pair);
      return res.json({ translatedText, detectedLang: sourceLang, provider: 'MyMemory (Fallback)' });
    } catch (fallbackErr) {
      res.status(500).json({ error: 'All Translation APIs failed: ' + err.message });
    }
  }
});

// File Translation & Summarization
router.post('/process-file', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    let extractedText = '';
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdf(req.file.buffer);
      extractedText = data.text;
    } else {
      extractedText = req.file.buffer.toString('utf-8');
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract any text from the file.' });
    }

    res.json({ text: extractedText.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// OpenAI / Gemini / Heuristic Summarization
router.post('/summarize', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // 1. Try OpenAI (Primary)
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_')) {
    try {
      console.log("✨ Summarizing with OpenAI GPT-4o-Mini...");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional assistant. Summarize the text into exactly 5 to 7 detailed, clear bullet points." },
          { role: "user", content: text }
        ]
      });
      
      const summary = response.choices[0].message.content;
      console.log("✅ OpenAI Summary generated successfully");
      return res.json({ summary });
    } catch (openaiErr) {
      console.warn('⚠️ OpenAI failed (Quota/Auth):', openaiErr.message);
    }
  }

  // 2. Try Gemini (Secondary Fallback)
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Summarize into 5-7 clear points: ${text}`;
      
      console.log("✨ Trying Gemini Pro...");
      const result = await model.generateContent(prompt);
      const resp = await result.response;
      console.log("✅ Gemini Summary generated");
      return res.json({ summary: resp.text() });
    } catch (geminiErr) {
      console.warn('⚠️ Gemini failed (404/Quota):', geminiErr.message);
    }
  }

  // 3. Lifeboat Mode: Heuristic Summarizer (Always works, no API needed!)
  console.log("🚢 Entering Summarization Lifeboat Mode (No API keys usable)");
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const filtered = sentences.filter(s => s.length > 20).slice(0, 7);
  const lifeboatSummary = filtered.length > 0 ? filtered.join('\n') : "Text is too short for a multi-point summary.";
  
  res.json({ 
    summary: lifeboatSummary,
    isLifeboat: true,
    warning: "AI Quota Exceeded. Using local summarization mode."
  });
});

// Murf Audio Generation with Language Mapping & Style Validation
router.post('/generate-audio', async (req, res) => {
  const { text, language = 'en' } = req.body;
  
  // Murf doesn't support Telugu for most basic API keys, and our check showed it's missing.
  // We force browser fallback for Telugu to ensure a smooth user experience.
  if (language === 'te') {
    return res.status(400).json({ 
      error: 'Telugu voice requires browser fallback for high quality.', 
      fallback: 'browser' 
    });
  }

  if (!process.env.MURF_API_KEY) return res.status(400).json({ error: 'Murf API key missing', fallback: 'browser' });

  // Validated Voice Mapping (Confirmed via API checks)
  const voiceMapping = {
    'hi': { voiceId: 'hi-IN-shweta', modelVersion: 'GEN2', style: 'Conversational' },
    'ta': { voiceId: 'ta-IN-sarvesh', modelVersion: 'GEN2', style: 'Conversational' },
    'te': { voiceId: 'te-IN-shravani', modelVersion: 'GEN1', style: null }, // Telugu often lacks style param in GEN1
    'en': { voiceId: 'en-US-natalie', modelVersion: 'GEN2', style: 'Conversational' }
  };

  const config = voiceMapping[language] || voiceMapping['en'];

  try {
    const payload = {
      text: text.substring(0, 1000), 
      voiceId: config.voiceId,
      modelVersion: config.modelVersion,
      encodeAsBase64: false,
      audioFormat: 'MP3'
    };
    
    // Only add style if defined and not null
    if (config.style) payload.style = config.style;

    const response = await axios.post('https://api.murf.ai/v1/speech/generate', payload, {
      headers: { 'api-key': process.env.MURF_API_KEY, 'Content-Type': 'application/json' }
    });
    
    res.json({ audioUrl: response.data.audioFile });
  } catch (err) {
    console.error(`❌ Murf Fail (${language}):`, err.response?.data || err.message);
    // Return a specific flag so frontend can use browser synthesis
    res.status(400).json({ 
      error: `Murf generation failed for ${language}. Using browser speaker.`,
      fallback: 'browser' 
    });
  }
});

module.exports = router;
