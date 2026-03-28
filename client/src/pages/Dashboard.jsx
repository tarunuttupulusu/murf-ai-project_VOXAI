import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';

const features = [
  { path: '/interview', label: 'HR Interview', icon: '🎤', desc: 'Speech-to-Speech mock interview with AI evaluator.', color: '#FFB800' },
  { path: '/translator', label: 'Translator', icon: '🌍', desc: 'Real-time voice-to-voice language translation.', color: '#FF8A00' },
  { path: '/voice-studio', label: 'Voice Studio', icon: '🎭', desc: 'Murf-style text-to-speech with customizable tones.', color: '#FFB800' },
  { path: '/tasks', label: 'Task Assistant', icon: '⏰', desc: 'Voice-controlled daily learning schedule reminders.', color: '#FFCC00' },
  { path: '/calls', label: 'Phone Calls', icon: '📞', desc: 'Automated real Twilio phone calls with AI voice.', color: '#FFB800' },
];

export default function Dashboard() {
  return (
    <div style={{ padding: '40px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-gradient" style={{ fontSize: 48, marginBottom: 16 }}>Welcome to VoxAI.</h1>
        <p style={{ color: 'rgba(235,235,235,0.7)', fontSize: 18, marginBottom: 40, maxWidth: 600 }}>
          Your production-ready AI Voice Platform. Select a workflow below to get started. 
          Make sure to configure your API keys in the sidebar first.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {features.map((feat, i) => (
            <NavLink key={feat.path} to={feat.path} style={{ textDecoration: 'none' }}>
              <motion.div 
                className="glass" 
                whileHover={{ y: -5, scale: 1.02 }}
                style={{ padding: 24, cursor: 'pointer', height: '100%', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: feat.color, opacity: 0.15, filter: 'blur(40px)', borderRadius: '50%' }} />
                
                <div style={{ fontSize: 40, marginBottom: 16 }}>{feat.icon}</div>
                <h3 style={{ fontSize: 20, marginBottom: 8, color: '#fff' }}>{feat.label}</h3>
                <p style={{ color: 'rgba(235,235,235,0.6)', fontSize: 14, lineHeight: 1.5 }}>{feat.desc}</p>
              </motion.div>
            </NavLink>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
