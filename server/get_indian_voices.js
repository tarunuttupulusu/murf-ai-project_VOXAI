const axios = require('axios');
require('dotenv').config();

async function findVoices() {
  const key = process.env.MURF_API_KEY;
  try {
    const r = await axios.get('https://api.murf.ai/v1/speech/voices', {
      headers: { 'api-key': key }
    });
    
    // Murf 1.0 API returns a flat array, Murf 2.0 (if they changed it) might be different.
    // Based on previous logs, it's an array.
    const voices = r.data.filter(v => 
        v.language && (v.language.includes('Hindi') || v.language.includes('Telugu') || v.language.includes('Tamil'))
    ).map(v => ({ id: v.voiceId, name: v.displayName, lang: v.language }));
    
    console.log(JSON.stringify(voices, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

findVoices();
