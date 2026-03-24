import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import HRInterview from './pages/HRInterview';
import Translator from './pages/Translator';
import VoiceStudio from './pages/VoiceStudio';
import TaskAssistant from './pages/TaskAssistant';
import PhoneCalls from './pages/PhoneCalls';
import ApiKeyModal from './components/ApiKeyModal';
import axios from 'axios';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/interview', label: 'HR Interview', icon: '🎤' },
  { path: '/translator', label: 'Translator', icon: '🌍' },
  { path: '/voice-studio', label: 'Voice Studio', icon: '🎭' },
  { path: '/tasks', label: 'Task Assistant', icon: '⏰' },
  { path: '/calls', label: 'Phone Calls', icon: '📞' },
];

function Sidebar({ onApiClick }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #00F5FF, #8A2BE2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0
          }}>🎙</div>
          <span className="logo-text" style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: '#EBEBEB' }}>VoxAI</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              background: isActive ? 'rgba(0,245,255,0.08)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(0,245,255,0.2)' : 'transparent'}`,
              color: isActive ? '#00F5FF' : 'rgba(235,235,235,0.6)',
              fontSize: 14, fontWeight: isActive ? 600 : 400,
            })}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* API Key button */}
      <div style={{ padding: '16px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onApiClick}
          className="btn-ghost"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span>🔐</span>
          <span className="nav-label">API Keys</span>
        </button>
      </div>
    </aside>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/interview" element={<HRInterview />} />
          <Route path="/translator" element={<Translator />} />
          <Route path="/voice-studio" element={<VoiceStudio />} />
          <Route path="/tasks" element={<TaskAssistant />} />
          <Route path="/calls" element={<PhoneCalls />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiStatus, setApiStatus] = useState({});

  useEffect(() => {
    axios.get('/api/config/status')
      .then(r => setApiStatus(r.data))
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      {/* Animated background */}
      <div className="animated-bg" />

      {/* Floating particles */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 3 + 1 + 'px',
            height: Math.random() * 3 + 1 + 'px',
            borderRadius: '50%',
            background: i % 2 === 0 ? 'rgba(0,245,255,0.3)' : 'rgba(138,43,226,0.3)',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animation: `float${i % 2 + 1} ${10 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: Math.random() * 5 + 's'
          }} />
        ))}
      </div>

      <Sidebar onApiClick={() => setShowApiModal(true)} />

      <main className="main-content">
        <AnimatedRoutes />
      </main>

      {showApiModal && (
        <ApiKeyModal
          apiStatus={apiStatus}
          onClose={() => { setShowApiModal(false); axios.get('/api/config/status').then(r => setApiStatus(r.data)); }}
        />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'rgba(6,11,24,0.95)', color: '#EBEBEB', border: '1px solid rgba(0,245,255,0.2)', backdropFilter: 'blur(20px)' }
        }}
      />
    </BrowserRouter>
  );
}
