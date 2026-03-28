/**
 * Robust Speech Utility for Frontend Browsers
 * Specifically handles Telugu, Hindi, and Tamil voice selection.
 */

export const speakWithFallback = (text, langCode) => {
  if (!window.speechSynthesis) {
    console.error('Speech Synthesis not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Mapping of internal language codes to BCP 47 locales
  const langMap = {
    'te': 'te-IN',
    'hi': 'hi-IN',
    'ta': 'ta-IN',
    'en': 'en-US'
  };

  const targetLocale = langMap[langCode] || langCode;
  utterance.lang = targetLocale;
  
  // Set some premium-feeling defaults
  utterance.rate = 0.95; // Slightly slower feels more natural
  utterance.pitch = 1.0;

  // Attempt to find the best voice
  const findBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    
    // 1. Try to find an exact locale match (e.g., te-IN)
    let bestVoice = voices.find(v => v.lang === targetLocale || v.lang.replace('_', '-') === targetLocale);
    
    // 2. If no exact match, try fuzzy matching name or lang (e.g., contains 'telugu')
    if (!bestVoice && langCode === 'te') {
      bestVoice = voices.find(v => v.name.toLowerCase().includes('telugu') || v.lang.toLowerCase().includes('te'));
    }
    
    // 3. Fallback to any Indian voice for Indian languages if specific one is missing
    if (!bestVoice && ['hi', 'te', 'ta'].includes(langCode)) {
      bestVoice = voices.find(v => v.lang.includes('IN'));
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
      console.log(`🔊 Selected Voice: ${bestVoice.name} (${bestVoice.lang})`);
    } else {
      console.warn(`⚠️ No specific voice found for ${targetLocale}, using browser default.`);
    }

    window.speechSynthesis.speak(utterance);
  };

  // Voices are loaded asynchronously in some browsers
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = findBestVoice;
  } else {
    findBestVoice();
  }
};
