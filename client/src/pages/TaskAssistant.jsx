import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { speakWithFallback } from '../utils/speech';

export default function TaskAssistant() {
  const [tasks, setTasks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('voxai_user_email') || '');
  const [userPhone, setUserPhone] = useState(localStorage.getItem('voxai_user_phone') || '');
  const [googleToken, setGoogleToken] = useState(JSON.parse(localStorage.getItem('voxai_google_token')) || null);
  const [isConfigured, setIsConfigured] = useState({ GOOGLE_CLIENT_ID: true });
  const [isLocalMode, setIsLocalMode] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    checkConfig();
    fetchTasks();
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl);
    socket.on('reminder', ({ task }) => {
      toast('Reminder: ' + task.title, { icon: '⏰', duration: 10000 });
      speakWithFallback('Reminder: ' + task.title, 'en');
      fetchTasks();
    });
    return () => socket.disconnect();
  }, []);

  const checkConfig = async () => {
    try {
      const { data } = await axios.get('/api/config/status');
      setIsConfigured(data);
    } catch (e) {
      console.warn('Config check failed');
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, status } = await axios.get('/api/tasks');
      // If server returns data (even empty array), it's a successful backend hit
      setTasks(data || []);
      localStorage.setItem('voxai_tasks_cache', JSON.stringify(data || []));
      setIsLocalMode(false);
    } catch (e) { 
      console.warn('Backend tasks failed, launching Lifeboat');
      loadFromLocal();
    }
  };

  const loadFromLocal = () => {
    const cached = JSON.parse(localStorage.getItem('voxai_tasks_cache') || '[]');
    setTasks(cached);
    setIsLocalMode(true);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (e) => {
        let finalTrans = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalTrans += e.results[i][0].transcript;
        }
        if (finalTrans) setTranscript((prev) => prev + ' ' + finalTrans);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => { if (isRecording) recognition.start(); };
      recognitionRef.current = recognition;
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (transcript.trim()) handleVoiceCommand(transcript);
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleVoiceCommand = async (text) => {
    toast.loading('Parsing command...', { id: 'cmd' });
    try {
      const { data: parsed } = await axios.post('/api/tasks/parse', { text });
      const taskData = {
        title: parsed.title,
        reminderAt: parsed.reminderAt,
        category: parsed.category,
        userEmail: userEmail,
        userPhone: userPhone,
        isImportant: false,
        googleToken: googleToken,
        _id: Date.now().toString(), // Temp ID for local
        createdAt: new Date()
      };

      try {
        await axios.post('/api/tasks', taskData);
        toast.success(`Task scheduled: ${parsed.title}`, { id: 'cmd' });
      } catch (err) {
        // Backend failed, save locally
        const currentTasks = JSON.parse(localStorage.getItem('voxai_tasks_cache') || '[]');
        const updated = [taskData, ...currentTasks];
        localStorage.setItem('voxai_tasks_cache', JSON.stringify(updated));
        setTasks(updated);
        setIsLocalMode(true);
        toast.success(`Task saved locally: ${parsed.title}`, { id: 'cmd' });
      }
      fetchTasks();
      setTranscript('');
    } catch (e) {
      toast.error('Failed to parse voice command', { id: 'cmd' });
    }
  };

  const connectGoogle = async () => {
    if (!isConfigured.GOOGLE_CLIENT_ID) {
      toast.error('Google OAuth not configured in .env', { duration: 5000 });
      return;
    }

    try {
      const { data } = await axios.get('/api/auth/google/url');
      const authWindow = window.open(data.url, '_blank', 'width=500,height=600');
      
      // Listen for the success message from the popup
      const handleMessage = (event) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          const { tokens, email } = event.data;
          
          setGoogleToken(tokens);
          localStorage.setItem('voxai_google_token', JSON.stringify(tokens));
          
          if (email) {
            setUserEmail(email);
            localStorage.setItem('voxai_user_email', email);
          }
          
          toast.success('Google Calendar connected!');
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (e) { toast.error('Connection failed: Invalid Client Configuration'); }
  };

  const saveEmail = (e) => {
    const email = e.target.value;
    setUserEmail(email);
    localStorage.setItem('voxai_user_email', email);
  };

  const savePhone = (e) => {
    const phone = e.target.value;
    setUserPhone(phone);
    localStorage.setItem('voxai_user_phone', phone);
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`);
      fetchTasks();
    } catch (e) { 
      // Fallback: Delete from local storage
      const currentTasks = JSON.parse(localStorage.getItem('voxai_tasks_cache') || '[]');
      const updated = currentTasks.filter(t => t._id !== id);
      localStorage.setItem('voxai_tasks_cache', JSON.stringify(updated));
      setTasks(updated);
      toast.success('Task removed from local storage');
    }
  };

  return (
    <div className="page-header" style={{ maxWidth: 1000, margin: '0 auto', width: '100%', paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: 12 }}>Task Assistant</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 18 }}>Schedule your day using voice commands and sync to your world.</p>
          {isLocalMode && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 20, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
              🚀 TASK LIFEBOAT ACTIVE (Local Mode)
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email Box */}
          <div className="glass" style={{ padding: '16px 20px', borderRadius: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--primary)', marginBottom: 8, letterSpacing: 1 }}>
              ✉️ NOTIFICATIONS EMAIL <span style={{fontSize: 10, opacity: 0.7}}>(T-30m)</span>
            </label>
            <input 
              type="email" 
              placeholder="your@email.com" 
              value={userEmail}
              onChange={saveEmail}
              className="glass-input"
              style={{ width: 220, height: 38, fontSize: 13 }}
            />
          </div>
          
          {/* Phone Box */}
          <div className="glass" style={{ padding: '16px 20px', borderRadius: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--primary)', marginBottom: 8, letterSpacing: 1 }}>
              📞 EMERGENCY PHONE <span style={{fontSize: 10, opacity: 0.7}}>(Overdue)</span>
            </label>
            <input 
              type="tel" 
              placeholder="+1234567890" 
              value={userPhone}
              onChange={savePhone}
              className="glass-input"
              style={{ width: 220, height: 38, fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 32 }}>
        {/* Voice Command Card */}
        <div className="glass" style={{ padding: 32, position: 'sticky', top: 32, height: 'fit-content' }}>
          <h3 style={{ marginBottom: 24, fontSize: 18, color: 'var(--primary)' }}>Assign New Task</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', textAlign: 'center' }}>
            <button 
              onClick={toggleRecording} 
              className={`mic-btn ${isRecording ? 'active' : 'inactive'}`}
              style={{ width: 100, height: 100 }}
            >
              <span style={{ fontSize: 40 }}>{isRecording ? '⏹' : '🎤'}</span>
            </button>
            <div style={{ fontSize: 16, lineHeight: 1.6, minHeight: 60 }}>
              {isRecording ? (
                <div style={{ color: 'var(--primary)' }}>
                  Listening...<br />
                  <span style={{ fontSize: 14, color: '#fff' }}>"{transcript}"</span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  "Remind me to call John at 5 PM"<br />
                  <span style={{ fontSize: 12 }}>Speech recognition will auto-parse the time and title.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task List Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AnimatePresence>
            {tasks.map((task, i) => (
              <motion.div 
                key={task._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="glass"
                style={{ 
                  padding: 24, display: 'flex', alignItems: 'center', gap: 20,
                  borderLeft: `4px solid ${task.googleEventId ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h4 style={{ fontSize: 18, color: '#fff', margin: 0 }}>{task.title}</h4>
                    {task.googleEventId && <span title="Synced with Google Calendar" style={{ fontSize: 14, color: 'var(--primary)' }}>📅</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span className="tag tag-purple" style={{ fontSize: 10, background: 'rgba(255, 184, 0, 0.1)', color: 'var(--primary)' }}>{task.category.toUpperCase()}</span>
                    {task.reminderAt && (
                      <span style={{ color: 'var(--primary)', fontSize: 13 }}>
                        ⏰ {new Date(task.reminderAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTask(task._id)} className="btn-ghost" style={{ padding: 8, opacity: 0.5 }}>🗑️</button>
              </motion.div>
            ))}
          </AnimatePresence>
          {tasks.length === 0 && (
            <div className="glass" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              No tasks scheduled for today.
            </div>
          )}

          {/* Sync Section at Bottom */}
          <div className="glass" style={{ marginTop: 20, padding: 32, textAlign: 'center', background: 'rgba(255, 184, 0, 0.05)' }}>
            <h4 style={{ marginBottom: 12, fontSize: 15 }}>External Integrations</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Connect to your Google account to automatically sync tasks to your calendar.</p>
            {!isConfigured.GOOGLE_CLIENT_ID || !isConfigured.GOOGLE_CLIENT_SECRET || (isConfigured.GOOGLE_CLIENT_ID_RAW === isConfigured.GOOGLE_CLIENT_SECRET_RAW && isConfigured.GOOGLE_CLIENT_ID_RAW !== undefined) ? (
              <div style={{ padding: '12px 20px', background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.1)', borderRadius: 12, display: 'inline-block' }}>
                <span style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>⚠️ Google OAuth Not Fully Configured</span>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  {isConfigured.GOOGLE_CLIENT_ID && isConfigured.GOOGLE_CLIENT_ID_RAW === isConfigured.GOOGLE_CLIENT_SECRET_RAW 
                    ? "Error: Your ID and Secret are identical. Please check line 11 in .env" 
                    : "Add both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file."}
                </p>
              </div>
            ) : googleToken ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span> Google Calendar Connected
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 13, textDecoration: 'none', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '8px 16px', borderRadius: 8 }}>
                    Open Calendar 📅
                  </a>
                  <button onClick={() => {
                    localStorage.removeItem('voxai_google_token');
                    setGoogleToken(null);
                    toast.success('Disconnected from Google');
                  }} className="btn-ghost" style={{ fontSize: 13, color: '#f87171', border: '1px solid #f87171', padding: '8px 16px', borderRadius: 8 }}>
                    Disconnect 🔌
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={connectGoogle} className="btn-primary" style={{ padding: '12px 32px', fontSize: 14 }}>
                Connect Google Calendar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Daily Task Assignment Table ─────────────────────────── */}
      <DailyTaskTable tasks={tasks} fetchTasks={fetchTasks} />

      {/* ── Performance Chart ───────────────────────────────────── */}
      <PerformanceChart />
    </div>
  );
}

// ── Daily Task Table ─────────────────────────────────────────────────────────
const DAILY_SEED = [
  { id: 1, title: 'Morning Stand-up', time: '9:00 AM',  status: 'Done', isImportant: false },
  { id: 2, title: 'Review Sprint Board', time: '10:00 AM', status: 'Done', isImportant: false },
  { id: 3, title: 'Client Call — John', time: '11:30 AM', status: 'In Progress', isImportant: true },
  { id: 4, title: 'Write Project Report', time: '2:00 PM', status: 'Pending', isImportant: false },
  { id: 5, title: 'Team Retrospective', time: '4:00 PM', status: 'Pending', isImportant: true },
  { id: 6, title: 'Gym Session', time: '6:30 PM', status: 'Pending', isImportant: false },
];

function TaskStatusBadge({ status }) {
  const map = {
    Done:        { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80', label: '✅ Done' },
    'In Progress': { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: '🔄 In Progress' },
    Pending:     { bg: 'rgba(255,255,255,0.06)',  color: 'rgba(235,235,235,0.5)', label: '⏳ Pending' },
  };
  const s = map[status] || map.Pending;
  return <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}

function DailyTaskTable({ tasks: liveTasks, fetchTasks }) {
  // We put DAILY_SEED inside state to allow visually starring them for demo usage
  const [localSeedTasks, setLocalSeedTasks] = useState(DAILY_SEED);

  // merge seeded + live voice tasks
  const rows = [
    ...localSeedTasks.map(s => ({ ...s, isLiveTask: false })),
    ...liveTasks.map((t, i) => ({ 
      id: t._id, 
      isLiveTask: true,
      title: t.title, 
      time: t.reminderAt ? new Date(t.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', 
      status: t.completed ? 'Done' : 'Pending',
      isImportant: t.isImportant || false
    })),
  ];

  const handleToggleImportant = async (row) => {
    if (!row.isLiveTask) {
      // Toggle local sample tasks visually
      setLocalSeedTasks(prev => prev.map(t => 
        t.id === row.id ? { ...t, isImportant: !t.isImportant } : t
      ));
      if (!row.isImportant) toast.success(`Active triggers: Email [-30m] + Auto-Call [Overdue]`);
      return; 
    }
    
    try {
      await axios.put(`/api/tasks/${row.id}`, { isImportant: !row.isImportant });
      fetchTasks();
      if (!row.isImportant) {
        toast.success(`Active triggers: Email [-30m] + Auto-Call [Overdue]`);
      }
    } catch (e) {
      toast.error('Failed to update task importance');
    }
  };

  return (
    <div className="glass" style={{ padding: 28, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, color: '#fff', margin: 0 }}>📋 Daily Task Assignment</h3>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,184,0,0.15)' }}>
              {['Task Title', 'Scheduled Time', 'Status', '⭐ Important'].map((h, idx) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: idx === 3 ? 'center' : 'left', color: 'var(--primary)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr key={row.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: row.status === 'In Progress' ? 'rgba(251,191,36,0.03)' : (row.isImportant ? 'rgba(255,184,0,0.04)' : 'transparent') }}
              >
                <td style={{ padding: '12px 16px', color: '#fff', fontWeight: row.isImportant ? 600 : 500 }}>{row.title}</td>
                <td style={{ padding: '12px 16px', color: 'var(--primary)', fontFamily: 'monospace' }}>{row.time}</td>
                <td style={{ padding: '12px 16px' }}><TaskStatusBadge status={row.status} /></td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button 
                      onClick={() => handleToggleImportant(row)}
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer', 
                        fontSize: 20, color: row.isImportant ? '#FFB800' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.2s', padding: 0
                      }}
                      title={row.isImportant ? "Remove importance" : "Highlight as Important"}
                    >
                      {row.isImportant ? '⭐' : '☆'}
                    </button>
                    {row.isImportant && (
                      <div style={{ display: 'flex', gap: 4, opacity: 0.7 }}>
                        <span title="Email at T-30 mins" style={{ fontSize: 10 }}>✉️</span>
                        <span title="Auto-Call if Overdue" style={{ fontSize: 10 }}>📞</span>
                      </div>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Performance Chart ─────────────────────────────────────────────────────────
const CHART_DATA = {
  '1D': [
    { label: '9AM', val: 1 }, { label: '10AM', val: 2 }, { label: '11AM', val: 1 },
    { label: '12PM', val: 3 }, { label: '2PM', val: 2 }, { label: '4PM', val: 1 }, { label: '6PM', val: 2 },
  ],
  '1W': [
    { label: 'Mon', val: 4 }, { label: 'Tue', val: 6 }, { label: 'Wed', val: 3 },
    { label: 'Thu', val: 7 }, { label: 'Fri', val: 5 }, { label: 'Sat', val: 2 }, { label: 'Sun', val: 4 },
  ],
  '1M': [
    { label: 'W1', val: 18 }, { label: 'W2', val: 22 }, { label: 'W3', val: 27 }, { label: 'W4', val: 31 },
  ],
  '3M': [
    { label: 'Jan', val: 68 }, { label: 'Feb', val: 82 }, { label: 'Mar', val: 95 },
  ],
  '6M': [
    { label: 'Oct', val: 55 }, { label: 'Nov', val: 63 }, { label: 'Dec', val: 72 },
    { label: 'Jan', val: 68 }, { label: 'Feb', val: 82 }, { label: 'Mar', val: 95 },
  ],
  '1Y': [
    { label: 'Apr', val: 42 }, { label: 'May', val: 49 }, { label: 'Jun', val: 55 },
    { label: 'Jul', val: 61 }, { label: 'Aug', val: 58 }, { label: 'Sep', val: 67 },
    { label: 'Oct', val: 55 }, { label: 'Nov', val: 63 }, { label: 'Dec', val: 72 },
    { label: 'Jan', val: 68 }, { label: 'Feb', val: 82 }, { label: 'Mar', val: 95 },
  ],
};
const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y'];

function PerformanceChart() {
  const [tf, setTf] = useState('1W');
  const data = CHART_DATA[tf];
  const max = Math.max(...data.map(d => d.val));
  const totalCompleted = data.reduce((s, d) => s + d.val, 0);
  const trend = data[data.length - 1].val > data[0].val;

  return (
    <div className="glass" style={{ padding: 28, marginTop: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 18, color: '#fff', margin: 0 }}>📊 Overall Performance</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{totalCompleted}</span>
            <span style={{ fontSize: 13, color: trend ? '#4ade80' : '#f87171' }}>
              {trend ? '▲' : '▼'} {trend ? '+' : ''}{Math.round(((data[data.length-1].val - data[0].val) / data[0].val) * 100)}% vs start
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tasks completed · {tf} view</span>
        </div>
        {/* Timeframe Selectors */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTf(t)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              background: tf === t ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: tf === t ? '#000' : 'var(--text-muted)',
              border: tf === t ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Line + Area Chart */}
      <div style={{ position: 'relative', height: 180 }}>
        <svg width="100%" height="180" viewBox={`0 0 ${data.length * 80} 180`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB800" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFB800" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1="0" y1={160 * f} x2={data.length * 80} y2={160 * f}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}

          {/* Area fill */}
          <motion.path
            d={`M0,${160 - (data[0].val / max) * 140} ${data.map((d, i) => `L${i * 80 + 40},${160 - (d.val / max) * 140}`).join(' ')} L${(data.length - 1) * 80 + 40},160 L0,160 Z`}
            fill="url(#areaGrad)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
          />

          {/* Line */}
          <motion.polyline
            points={data.map((d, i) => `${i * 80 + 40},${160 - (d.val / max) * 140}`).join(' ')}
            fill="none" stroke="#FFB800" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Data point dots */}
          {data.map((d, i) => (
            <motion.circle key={i}
              cx={i * 80 + 40} cy={160 - (d.val / max) * 140} r="4"
              fill="#FFB800" stroke="#050505" strokeWidth="2"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.05 }}
            />
          ))}
        </svg>

        {/* X-axis labels */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
          {data.map((d, i) => (
            <span key={i} style={{ fontSize: 11, color: i === data.length - 1 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: i === data.length - 1 ? 700 : 400 }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* Mini Stats */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        {[
          { label: 'Peak Day', val: Math.max(...data.map(d => d.val)), color: '#4ade80' },
          { label: 'Avg / Period', val: (totalCompleted / data.length).toFixed(1), color: 'var(--primary)' },
          { label: 'Min Day', val: Math.min(...data.map(d => d.val)), color: '#f87171' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
