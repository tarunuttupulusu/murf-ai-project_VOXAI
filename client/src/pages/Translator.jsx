import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const languages = [
  { id: 'en', label: 'English' }, 
  { id: 'hi', label: 'Hindi (हिन्दी)' }, 
  { id: 'te', label: 'Telugu (తెలుగు)' }, 
  { id: 'ta', label: 'Tamil (தமிழ்)' }
];

function DecorativeSelect({ label, value, options, onChange, color = 'var(--primary)' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = options.find(o => o.id === value);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${isOpen ? color : 'rgba(255,255,255,0.1)'}`, 
          borderRadius: 8, color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s'
        }}
      >
        <span>{selected?.label || value}</span>
        <span style={{ fontSize: 8, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
            style={{ 
              position: 'absolute', top: '120%', left: 0, minWidth: 160, zIndex: 100,
              background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {options.map(o => (
              <div 
                key={o.id} onClick={() => { onChange(o.id); setIsOpen(false); }}
                style={{ 
                  padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: value === o.id ? color : 'rgba(255,255,255,0.7)',
                  background: value === o.id ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = value === o.id ? 'rgba(255,255,255,0.05)' : 'transparent'}
              >
                {o.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Translator() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [summaryPoints, setSummaryPoints] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingSummaryAudio, setIsGeneratingSummaryAudio] = useState(false);
  const [translationAudioUrl, setTranslationAudioUrl] = useState(null);
  const [summaryAudioUrl, setSummaryAudioUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lifeboatWarning, setLifeboatWarning] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post('/api/translate/process-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setOriginalText(data.text);
      toast.success('File processed successfully!');
    } catch (e) {
      toast.error('Failed to process file');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const translateText = async () => {
    if (!originalText) return toast.error('Enter some text first');
    setIsTranslating(true);
    try {
      const { data } = await axios.post('/api/translate', { 
        text: originalText, 
        sourceLang, targetLang 
      });
      setTranslatedText(data.translatedText);
      toast.success('Translated successfully');
      setLifeboatWarning(''); // Clear any previous warnings
    } catch (e) {
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const summarizeText = async () => {
    if (!translatedText && !originalText) return toast.error('No text to summarize');
    setIsSummarizing(true);
    setLifeboatWarning('');
    try {
      const textToSummarize = translatedText || originalText;
      const { data } = await axios.post('/api/translate/summarize', { text: textToSummarize });
      
      if (data.isLifeboat) {
        setLifeboatWarning(data.warning || 'AI Quota Exceeded. Using local summary.');
      }

      // Parse points (assuming Gemini returns bullet points)
      const points = data.summary.split('\n').filter(p => p.trim()).map(p => p.replace(/^[\s*-]+|\d+\.\s*/, '').trim()).slice(0, 7);
      setSummaryPoints(points.length > 0 ? points : [data.summary]);
      toast.success(data.isLifeboat ? 'Summarized (Lifeboat mode)' : 'Summarized by AI');
    } catch (e) {
      toast.error('Summarization failed');
    } finally {
      setIsSummarizing(false);
    }
  };

  const generateTranslationAudio = async () => {
    if (!translatedText) return toast.error('No translated text');
    setIsGeneratingAudio(true);
    try {
      const { data } = await axios.post('/api/translate/generate-audio', { 
        text: translatedText,
        language: targetLang 
      });
      setTranslationAudioUrl(data.audioUrl);
      toast.success('Translation audio generated');
    } catch (e) {
      if (e.response?.data?.fallback === 'browser') {
        toast('Using browser speaker (Murf error)', { icon: '📢' });
        const speech = new SpeechSynthesisUtterance(translatedText);
        speech.lang = targetLang === 'hi' ? 'hi-IN' : targetLang === 'te' ? 'te-IN' : targetLang === 'ta' ? 'ta-IN' : 'en-US';
        window.speechSynthesis.speak(speech);
      } else {
        toast.error('Audio generation failed');
      }
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const generateSummaryAudio = async () => {
    if (summaryPoints.length === 0) return toast.error('No summary points');
    setIsGeneratingSummaryAudio(true);
    try {
      const textToSpeak = "Here is the summary. " + summaryPoints.join('. ');
      const { data } = await axios.post('/api/translate/generate-audio', { 
        text: textToSpeak,
        language: targetLang 
      });
      setSummaryAudioUrl(data.audioUrl);
      toast.success('Summary audio generated');
    } catch (e) {
      if (e.response?.data?.fallback === 'browser') {
        const textToSpeak = summaryPoints.join('. ');
        toast('Using browser speaker (Murf error)', { icon: '📢' });
        const speech = new SpeechSynthesisUtterance(textToSpeak);
        speech.lang = targetLang === 'hi' ? 'hi-IN' : targetLang === 'te' ? 'te-IN' : targetLang === 'ta' ? 'ta-IN' : 'en-US';
        window.speechSynthesis.speak(speech);
      } else {
        toast.error('Audio generation failed');
      }
    } finally {
      setIsGeneratingSummaryAudio(false);
    }
  };

  return (
    <div className="page-header" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: 60 }}>
      <h1 className="text-gradient" style={{ marginBottom: 32 }}>Advanced Workflow Translator</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '300px 300px', gap: 32, flex: 1 }}>
        
        {/* Row 1, Left: Input Area */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 1.5 }}>INPUT LANGUAGE</span>
            <DecorativeSelect 
              value={sourceLang} 
              options={[{ id: 'auto', label: 'Auto-Detect' }, ...languages]} 
              onChange={setSourceLang} 
              color="var(--primary)"
            />
          </div>
          <textarea 
            value={originalText} onChange={e => setOriginalText(e.target.value)}
            placeholder="Type or paste text here, or drop a file below..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', padding: 20, resize: 'none', fontSize: 15, lineHeight: 1.6 }}
          />
          <div style={{ padding: 12, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={() => setOriginalText('')} style={{ fontSize: 11, opacity: 0.5, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Clear</button>
            <button onClick={translateText} className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, borderRadius: 6 }}>
              {isTranslating ? 'Translating...' : 'Translate ➜'}
            </button>
          </div>
        </div>

        {/* Row 1, Right: Output Area */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,255,255,0.02)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1.5 }}>TARGET LANGUAGE</span>
            <DecorativeSelect 
              value={targetLang} 
              options={languages} 
              onChange={setTargetLang} 
              color="var(--cyan)"
            />
          </div>
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', fontSize: 15, lineHeight: 1.6, color: 'var(--primary)' }}>
            {translatedText || <span style={{ opacity: 0.2 }}>Translation will appear here...</span>}
          </div>
          <div style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={generateTranslationAudio} disabled={!translatedText || isGeneratingAudio} className="btn-ghost" style={{ padding: '6px 16px', fontSize: 12, borderRadius: 6 }}>
              {isGeneratingAudio ? '🔈 Generating...' : '🔈 Listen'}
            </button>
            {translationAudioUrl && (
              <audio controls src={translationAudioUrl} autoPlay style={{ height: 30, width: 200 }} />
            )}
            <button onClick={summarizeText} disabled={!translatedText || isSummarizing} className="btn-primary" style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: 12, borderRadius: 6, background: 'var(--purple)' }}>
              {isSummarizing ? '✨ Summarizing...' : '✨ Summarize (Gemini)'}
            </button>
          </div>
        </div>

        {/* Row 2, Left: File Drop Area */}
        <div 
          {...getRootProps()} 
          className="glass" 
          style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            border: `2px dashed ${isDragActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, 
            cursor: 'pointer', transition: 'all 0.2s', background: isDragActive ? 'rgba(255, 184, 0, 0.05)' : 'transparent'
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: 40, marginBottom: 12 }}>{isUploading ? '⌛' : '📄'}</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: '0 20px' }}>
            {isUploading ? 'Uploading & Extracting Text...' : (isDragActive ? 'Drop the file here' : 'Drop a .pdf or .txt file here, or click to browse')}
          </p>
          <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Max Size: 10MB</div>
        </div>

        {/* Row 2, Right: Summary Area */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto', position: 'relative' }}>
          {lifeboatWarning && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(255, 184, 0, 0.2)', color: '#ffb800', fontSize: 10, padding: '4px 12px', textAlign: 'center', fontWeight: 600, letterSpacing: 0.5 }}>
              ⚠️ {lifeboatWarning}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: lifeboatWarning ? 12 : 0 }}>
             <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)' }} />
             <h3 style={{ fontSize: 16, margin: 0, color: '#fff' }}>Gemini Executive Summary</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {summaryPoints.length > 0 ? (
              summaryPoints.map((point, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  style={{ display: 'flex', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, borderLeft: '3px solid var(--purple)' }}
                >
                  <span style={{ color: 'var(--purple)', fontWeight: 800 }}>{i+1}.</span>
                  <span>{point}</span>
                </motion.div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
                <div>Generate a summary to see the key highlights here.</div>
              </div>
            )}
          </div>

          {summaryPoints.length > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
               {summaryAudioUrl && (
                  <audio controls src={summaryAudioUrl} autoPlay style={{ height: 30, width: 200 }} />
               )}
               <button onClick={generateSummaryAudio} disabled={isGeneratingSummaryAudio} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 11, borderRadius: 6 }}>
                  {isGeneratingSummaryAudio ? '⌛ Generating...' : '🔊 Read Summary Aloud'}
               </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
