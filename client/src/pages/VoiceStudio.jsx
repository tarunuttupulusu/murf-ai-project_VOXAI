import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const getFlag = (locale) => {
  if (!locale) return '🌐';
  if (locale.includes('US')) return '🇺🇸';
  if (locale.includes('UK') || locale.includes('GB')) return '🇬🇧';
  if (locale.includes('IN')) return '🇮🇳';
  if (locale.includes('IT')) return '🇮🇹';
  if (locale.includes('ES') || locale.includes('MX')) return '🇪🇸';
  if (locale.includes('FR')) return '🇫🇷';
  if (locale.includes('DE')) return '🇩🇪';
  if (locale.includes('AU')) return '🇦🇺';
  if (locale.includes('JP')) return '🇯🇵';
  if (locale.includes('KR')) return '🇰🇷';
  if (locale.includes('BR')) return '🇧🇷';
  if (locale.includes('CN')) return '🇨🇳';
  if (locale.includes('RU')) return '🇷🇺';
  return '🌐';
};

const getEmoji = (style) => {
  if (!style) return '🎭';
  const s = style.toLowerCase();
  if (s.includes('conversational')) return '🧑‍💻';
  if (s.includes('inspir') || s.includes('promo')) return '📢';
  if (s.includes('meditat')) return '🧘';
  if (s.includes('terrif') || s.includes('fear')) return '😱';
  if (s.includes('sorrow') || s.includes('sad')) return '😢';
  if (s.includes('furious') || s.includes('angry')) return '😡';
  if (s.includes('newscast') || s.includes('news')) return '📰';
  if (s.includes('excited') || s.includes('happy')) return '🤩';
  if (s.includes('calm')) return '😌';
  if (s.includes('cheerful')) return '😊';
  return '🎭';
};

export default function VoiceStudio() {
  const [text, setText] = useState('');
  
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState(null);
  const [showVoiceDrop, setShowVoiceDrop] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState('');
  
  const [emotion, setEmotion] = useState(null);
  const [showEmotionDrop, setShowEmotionDrop] = useState(false);
  const [emotionSearch, setEmotionSearch] = useState('');

  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState([]);
  
  const toolbarRef = useRef(null);

  useEffect(() => {
    fetchVoices();
    fetchProjects();
    
    const handleClickOutside = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setShowVoiceDrop(false);
        setShowEmotionDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVoices = async () => {
    try {
      const { data } = await axios.get('/api/voice/available');
      if (data && data.length > 0) {
        setVoices(data);
        const defaultVoice = data.find(v => v.voiceId === 'en-US-natalie') || data[0];
        setVoice(defaultVoice);
        setEmotion(defaultVoice.availableStyles?.[0] || 'Conversational');
      }
    } catch {
      toast.error("Failed to load Murf AI voices");
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await axios.get('/api/voice/projects');
      setProjects(data);
    } catch {
      // Handle error implicitly
    }
  };

  const generateVoice = async () => {
    if (!text) return toast.error('Enter some text first');
    if (!voice) return toast.error('Voices still loading...');
    
    setIsGenerating(true);
    try {
      const response = await axios.post('/api/voice/generate', { 
        text, 
        voiceId: voice.voiceId, 
        style: emotion, 
        pitch, 
        rate: speed 
      });
      toast.success('Voice generated successfully!');
      
      // Inject instantly into UI (since local DB might be offline)
      setProjects(prev => [{
        _id: Math.random().toString(),
        input: text,
        language: `${voice.displayName} (${emotion})`,
        output: response.data.audioUrl,
        createdAt: new Date()
      }, ...prev]);
      
      // Also tell DB to save if it can
      fetchProjects();
    } catch (e) {
      if (e.response?.data?.fallback) {
        toast('Using browser fallback (Murf API key missing)', { icon: 'ℹ️' });
        const u = new SpeechSynthesisUtterance(text);
        u.pitch = 1 + (pitch / 100);
        u.rate = 1 + (speed / 100);
        window.speechSynthesis.speak(u);
        
        // Mock save for fallback
        setProjects(prev => [{
          _id: Math.random().toString(),
          input: text,
          language: `${voice.displayName} (${emotion})`,
          output: null,
          createdAt: new Date()
        }, ...prev]);
      } else {
        toast.error(e.response?.data?.error || e.message || 'Failed to generate voice');
      }
    }
    setIsGenerating(false);
  };

  const filteredVoices = voices.filter(v => 
    (v.displayLanguage || '').toLowerCase().includes(voiceSearch.toLowerCase()) || 
    (v.displayName || '').toLowerCase().includes(voiceSearch.toLowerCase()) ||
    (v.accent || '').toLowerCase().includes(voiceSearch.toLowerCase())
  );

  const filteredEmotions = (voice?.availableStyles || []).filter(e => 
    e.toLowerCase().includes(emotionSearch.toLowerCase())
  );

  return (
    <div className="page-header" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 32, position: 'relative' }}>
      <h1 className="text-gradient" style={{ marginBottom: 32 }}>Voice Studio</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* ── Studio Generation Box ──────────────────────────────────── */}
        <div className="glass" style={{ padding: 20 }}>
          
          {/* Top Control Bar (Murf Style) */}
          <div ref={toolbarRef} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            
            {/* Voice Dropdown */}
            <div style={{ position: 'relative', zIndex: 20 }}>
              <button 
                onClick={() => { setShowVoiceDrop(!showVoiceDrop); setShowEmotionDrop(false); }}
                className="btn-ghost"
                disabled={!voice}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24 }}
              >
                <span>{voice ? voice.displayName : 'Loading...'}</span>
                <span>{voice ? getFlag(voice.locale) : '⏳'}</span>
                <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
              </button>
              
              <AnimatePresence>
                {showVoiceDrop && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, pointerEvents: 'none' }}
                    className="glass"
                    style={{ position: 'absolute', top: 45, left: 0, width: 280, padding: 12, borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                  >
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <span style={{ position: 'absolute', left: 12, top: 8, opacity: 0.5 }}>🔍</span>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        value={voiceSearch}
                        onChange={e => setVoiceSearch(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', paddingLeft: 36, paddingRight: 10, height: 36, fontSize: 13, borderRadius: 8, boxSizing: 'border-box' }}
                        autoFocus
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>
                      Supported Voices & Languages
                    </div>
                    <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                      {filteredVoices.map(v => (
                        <div 
                          key={v.voiceId}
                          onClick={() => { 
                            setVoice(v); 
                            setEmotion(v.availableStyles?.[0] || 'Conversational');
                            setShowVoiceDrop(false); 
                          }}
                          style={{ 
                            padding: '8px 12px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                            background: voice?.voiceId === v.voiceId ? 'rgba(37,99,235,0.3)' : 'transparent',
                            color: voice?.voiceId === v.voiceId ? '#fff' : 'var(--text-muted)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = voice?.voiceId === v.voiceId ? 'rgba(37,99,235,0.3)' : 'transparent'}
                        >
                          <span style={{ fontSize: 16 }}>{getFlag(v.locale)}</span>
                          <span style={{ fontSize: 13 }}>{v.displayName} ({v.displayLanguage})</span>
                          {voice?.voiceId === v.voiceId && <span style={{ marginLeft: 'auto', color: '#fff' }}>✓</span>}
                        </div>
                      ))}
                      {filteredVoices.length === 0 && <div style={{ fontSize: 12, color: '#ffb800', textAlign: 'center', padding: 8 }}>No voices found.</div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Emotion Dropdown */}
            <div style={{ position: 'relative', zIndex: 20 }}>
              <button 
                onClick={() => { setShowEmotionDrop(!showEmotionDrop); setShowVoiceDrop(false); }}
                className="btn-ghost"
                disabled={!emotion}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: 24 }}
              >
                <span>{getEmoji(emotion)}</span>
                <span>{emotion || 'Style'}</span>
                <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
              </button>
              
              <AnimatePresence>
                {showEmotionDrop && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, pointerEvents: 'none' }}
                    className="glass"
                    style={{ position: 'absolute', top: 45, left: 0, width: 220, padding: 12, borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                  >
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <span style={{ position: 'absolute', left: 12, top: 8, opacity: 0.5 }}>🔍</span>
                      <input 
                        type="text" 
                        placeholder="Filter available styles..." 
                        value={emotionSearch}
                        onChange={e => setEmotionSearch(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', paddingLeft: 36, paddingRight: 10, height: 36, fontSize: 13, borderRadius: 8, boxSizing: 'border-box' }}
                        autoFocus
                      />
                    </div>
                    <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                      {filteredEmotions.map(e => (
                        <div 
                          key={e}
                          onClick={() => { setEmotion(e); setShowEmotionDrop(false); }}
                          style={{ 
                            padding: '8px 12px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                            background: emotion === e ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: emotion === e ? '#fff' : 'var(--text-muted)'
                          }}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = emotion === e ? 'rgba(255,255,255,0.08)' : 'transparent'}
                        >
                          <span style={{ fontSize: 14 }}>{getEmoji(e)}</span>
                          <span style={{ fontSize: 13 }}>{e}</span>
                        </div>
                      ))}
                      {filteredEmotions.length === 0 && <div style={{ fontSize: 12, color: '#ffb800', textAlign: 'center', padding: 8 }}>Style unavailable for this voice.</div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pitch & Speed Params */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 90 }}>
                  <span>Pitch</span>
                  <span style={{ color: '#fff' }}>{pitch > 0 ? '+'+pitch : pitch}%</span>
                </div>
                <input type="range" min="-50" max="50" value={pitch} onChange={e => setPitch(Number(e.target.value))} style={{ width: 90, height: 4 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 90 }}>
                  <span>Speed</span>
                  <span style={{ color: '#fff' }}>{speed > 0 ? '+'+speed : speed}%</span>
                </div>
                <input type="range" min="-50" max="50" value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ width: 90, height: 4 }} />
              </div>
              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                <span>Add Pause</span>
                <span>✦ Variability</span>
                <span>❝ Emphasis</span>
              </div>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            style={{ width: '100%', height: 160, padding: 16, color: '#fff', border: 'none', resize: 'none', background: 'transparent', fontSize: 16, outline: 'none' }}
            placeholder="Type your script here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button 
              onClick={generateVoice}
              disabled={isGenerating || !text || !voice}
              className="btn-primary"
              style={{ padding: '12px 32px', fontSize: 15, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isGenerating ? 'Generating...' : <><span>🎙️</span> GENERATE VOICE</>}
            </button>
          </div>
        </div>


        {/* ── Projects History Table ──────────────────────────────────── */}
        <div className="glass" style={{ padding: 28, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, color: '#fff', margin: 0 }}>📁 My Projects</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{projects.length} Total Generations</span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,184,0,0.15)' }}>
                  {['Date', 'Script Preview', 'Voice Settings', 'Audio Playback'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--primary)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((proj, i) => (
                  <motion.tr key={proj._id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(proj.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      "{proj.input}"
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--cyan)', fontSize: 13 }}>
                      {proj.language}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {proj.output ? (
                        <audio controls src={proj.output} style={{ height: 32, width: 220 }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Browser fallback (No file)</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No projects found. Generate audio to see it here!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
