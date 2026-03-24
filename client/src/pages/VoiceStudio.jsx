import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function VoiceStudio() {
  const [text, setText] = useState('');
  const [preset, setPreset] = useState('female');
  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    axios.get('/api/voice/presets').then(res => setPresets(res.data)).catch(() => {});
  }, []);

  const generateVoice = async () => {
    if (!text) return toast.error('Enter some text first');
    setIsGenerating(true);
    setAudioUrl(null);
    try {
      const { data } = await axios.post('/api/voice/generate', { text, preset, pitch, rate: speed });
      setAudioUrl(data.audioUrl);
      toast.success('Voice generated successfully!');
    } catch (e) {
      if (e.response?.data?.fallback) {
        toast('Using browser fallback (Murf API key missing)', { icon: 'ℹ️' });
        const u = new SpeechSynthesisUtterance(text);
        u.pitch = 1 + (pitch / 100);
        u.rate = 1 + (speed / 100);
        window.speechSynthesis.speak(u);
      } else {
        toast.error('Failed to generate voice');
      }
    }
    setIsGenerating(false);
  };

  return (
    <div className="page-header" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 32 }}>
      <h1 className="text-gradient" style={{ marginBottom: 32 }}>Voice Studio</h1>

      <div style={{ display: 'flex', gap: 32, flex: 1 }}>
        {/* Left Config Panel */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Text Input */}
          <div className="glass" style={{ padding: 24 }}>
            <label style={{ display: 'block', marginBottom: 16, color: 'var(--cyan)' }}>Speech Prompt</label>
            <textarea
              className="glass"
              style={{ width: '100%', height: 150, padding: 16, color: '#fff', border: 'none', resize: 'none', background: 'rgba(255,255,255,0.02)' }}
              placeholder="Enter the script you want the AI to speak..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Voice Presets */}
          <div className="glass" style={{ padding: 24 }}>
            <label style={{ display: 'block', marginBottom: 16, color: 'var(--purple)' }}>AI Voice Model</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
              {presets.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setPreset(p.id)}
                  className={`glass ${preset === p.id ? 'glass-active' : ''}`}
                  style={{ padding: '16px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{p.id === 'female' ? '👩' : p.id === 'deep' ? '👨' : p.id === 'robot' ? '🤖' : '🎭'}</div>
                  <div style={{ fontWeight: 600 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.style}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="glass" style={{ padding: 24, display: 'flex', gap: 32 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span>Pitch Modifier</span>
                <span style={{ color: 'var(--cyan)' }}>{pitch > 0 ? '+'+pitch : pitch}%</span>
              </label>
              <input type="range" min="-50" max="50" value={pitch} onChange={e => setPitch(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span>Speed Modifier</span>
                <span style={{ color: 'var(--purple)' }}>{speed > 0 ? '+'+speed : speed}%</span>
              </label>
              <input type="range" min="-50" max="50" value={speed} onChange={e => setSpeed(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Right Output Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <button 
            onClick={generateVoice}
            disabled={isGenerating || !text}
            className="btn-primary"
            style={{ padding: 24, fontSize: 20, borderRadius: 16, width: '100%' }}
          >
            {isGenerating ? 'Generating Audio...' : 'Generate Voice 🚀'}
          </button>

          <div className="glass" style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,245,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              <span style={{ fontSize: 40 }}>{audioUrl ? '🎵' : '🔇'}</span>
            </div>
            
            {audioUrl ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <h3 style={{ marginBottom: 24, color: 'var(--cyan)' }}>Preview Ready</h3>
                <audio controls src={audioUrl} style={{ width: '100%' }} autoPlay />
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Generate voice to hear the preview.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
