import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function ApiKeyModal({ apiStatus, onClose }) {
  const [keys, setKeys] = useState({
    MURF_API_KEY: '',
    OPENAI_API_KEY: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_PHONE_NUMBER: '',
    GOOGLE_TRANSLATE_API_KEY: ''
  });

  const handleSave = async (keyName) => {
    if (!keys[keyName]) return;
    try {
      await axios.post('/api/config/key', { key: keyName, value: keys[keyName] });
      toast.success(`${keyName} saved successfully!`);
      setKeys(prev => ({ ...prev, [keyName]: '' }));
      onClose(); // Auto close to refresh status
    } catch (e) {
      toast.error('Failed to save API key');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6,11,24,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass"
        style={{ width: '100%', maxWidth: 600, padding: 32, position: 'relative' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
        <h2 style={{ marginBottom: 24, fontSize: 24 }}>API Configuration</h2>
        <p style={{ color: 'rgba(235,235,235,0.7)', marginBottom: 24, fontSize: 14 }}>Enter your API keys below. They are securely saved to the backend `.env` file.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(keys).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4, color: apiStatus[k] ? '#22c55e' : 'rgba(235,235,235,0.5)' }}>
                  {apiStatus[k] ? '✅ Configured' : '❌ Missing'} - {k}
                </div>
                <input
                  type="password"
                  placeholder={`Enter ${k}...`}
                  value={v}
                  onChange={(e) => setKeys({ ...keys, [k]: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', outline: 'none'
                  }}
                />
              </div>
              <button 
                onClick={() => handleSave(k)}
                className="btn-primary"
                style={{ padding: '10px 20px', borderRadius: 8, marginTop: 20 }}
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
