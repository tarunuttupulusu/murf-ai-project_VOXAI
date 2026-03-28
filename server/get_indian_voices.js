const axios = require('axios');
require('dotenv').config();

async function findVoices() {
  const key = process.env.MURF_API_KEY;
  try {
    const r = await axios.get('https://api.murf.ai/v1/speech/voices', {
      headers: { 'api-key': key }
    });
    
    const allAccents = [...new Set(r.data.map(v => v.accent))];
    console.log('All accents:', allAccents);

    const voices = r.data.filter(v => 
        (v.accent && v.accent.toLowerCase().includes('india')) ||
        (v.locale && v.locale.toLowerCase().includes('in')) ||
        (v.displayLanguage && v.displayLanguage.toLowerCase().includes('telugu'))
    ).map(v => ({ id: v.voiceId, name: v.displayName, lang: v.displayLanguage, locale: v.locale, accent: v.accent }));
    
    console.log('Filtered voices:', JSON.stringify(voices, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

findVoices();
