import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const languages = [
  { id: 'en', label: 'English' }, { id: 'hi', label: 'Hindi (हिन्दी)' }, 
  { id: 'es', label: 'Spanish' }, { id: 'fr', label: 'French' }, 
  { id: 'ja', label: 'Japanese' }, { id: 'ko', label: 'Korean' },
  { id: 'te', label: 'Telugu' }, { id: 'ta', label: 'Tamil' }
];

export default function Translator() {
  const [isRecording, setIsRecording] = useState(false);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (e) => {
        let finalTrans = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalTrans += e.results[i][0].transcript;
        }
        if (finalTrans) {
          setOriginalText(prev => prev + ' ' + finalTrans);
          triggerTranslation(finalTrans);
        }
      };
      
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => { if (isRecording) recognition.start(); };
      recognitionRef.current = recognition;
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, [isRecording]);

  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.lang = sourceLang;
  }, [sourceLang]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setOriginalText('');
      setTranslatedText('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const triggerTranslation = (text) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setIsTranslating(true);
      try {
        const { data } = await axios.post('/api/translate', { 
          text: originalText + ' ' + text, 
          sourceLang, targetLang 
        });
        setTranslatedText(data.translatedText);
        speak(data.translatedText, targetLang);
      } catch (e) {
        toast.error('Translation failed');
      }
      setIsTranslating(false);
    }, 1000); // 1s debounce after speech stops
  };

  const speak = (text, lang) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="page-header" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 32 }}>
      <h1 className="text-gradient" style={{ marginBottom: 32 }}>Live Translator</h1>

      <div style={{ display: 'flex', gap: 32, flex: 1 }}>
        {/* Source Panel */}
        <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <select 
              value={sourceLang} onChange={e => setSourceLang(e.target.value)}
              className="glass" style={{ padding: '8px 16px', color: '#fff', border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}
            >
              {languages.map(l => <option key={l.id} value={l.id} style={{ color: '#000' }}>{l.label}</option>)}
            </select>
            <div style={{ color: 'var(--cyan)' }}>🎤 Input</div>
          </div>
          
          <div style={{ flex: 1, padding: 32, fontSize: 24, lineHeight: 1.5 }}>
            {originalText || <span style={{ color: 'var(--text-muted)' }}>Tap the mic to start speaking...</span>}
          </div>

          <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
            <button onClick={toggleRecording} className={`mic-btn ${isRecording ? 'active' : 'inactive'}`}>
              <span style={{ fontSize: 32 }}>{isRecording ? '⏹' : '🎤'}</span>
            </button>
          </div>
        </div>

        {/* Middle Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ fontSize: 32, color: 'var(--border-active)' }}>
            ➡️
          </motion.div>
        </div>

        {/* Target Panel */}
        <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {isTranslating && (
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)', animation: 'slideRight 2s infinite' }} />
          )}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(138,43,226,0.05)' }}>
            <select 
              value={targetLang} onChange={e => setTargetLang(e.target.value)}
              className="glass" style={{ padding: '8px 16px', color: '#fff', border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}
            >
              {languages.map(l => <option key={l.id} value={l.id} style={{ color: '#000' }}>{l.label}</option>)}
            </select>
            <div style={{ color: 'var(--purple)' }}>🔊 Translated</div>
          </div>
          
          <div style={{ flex: 1, padding: 32, fontSize: 28, lineHeight: 1.5, color: '#00F5FF' }}>
            {translatedText ? translatedText : <span style={{ color: 'rgba(0,245,255,0.3)' }}>Translation will appear here...</span>}
          </div>

          <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => speak(translatedText, targetLang)} disabled={!translatedText} className="btn-ghost" style={{ padding: '16px 24px', borderRadius: 50, fontSize: 24, boxShadow: '0 0 20px rgba(138,43,226,0.2)' }}>
              🔊 Play Audio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
