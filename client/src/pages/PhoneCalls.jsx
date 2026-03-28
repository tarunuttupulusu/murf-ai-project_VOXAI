import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Mock data seeded for demo
const MOCK_INCOMING = [
  { id: 1, client: 'John Doe', phone: '+14155552671', time: '2:30 PM, Mar 24', duration: '5 min', query: 'Rescheduling dental appointment', status: 'Completed' },
  { id: 2, client: 'Jane Smith', phone: '+14155553892', time: '11:00 AM, Mar 24', duration: '—', query: 'Insurance coverage query', status: 'Missed' },
  { id: 3, client: 'Raj Sharma', phone: '+91987654321', time: '9:15 AM, Mar 24', duration: '3 min', query: 'Slot availability for checkup', status: 'Completed' },
];

const MOCK_OUTGOING = [
  { id: 1, client: 'Alex Kumar', phone: '+14155554901', slot: '3:00 PM, Mar 25', calledAt: '2:35 PM, Mar 24', status: 'Confirmed' },
  { id: 2, client: 'Maria Lopez', phone: '+14155557832', slot: '10:00 AM, Mar 25', calledAt: '9:45 AM, Mar 24', status: 'No Answer' },
  { id: 3, client: 'Priya Nair', phone: '+91887766554', slot: '12:00 PM, Mar 26', calledAt: '4:00 PM, Mar 24', status: 'Confirmed' },
];

function StatusBadge({ status }) {
  const styles = {
    Completed: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: '✅ Completed' },
    Missed: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: '❌ Missed' },
    Confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: '✅ Confirmed' },
    'No Answer': { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', label: '⚠️ No Answer' },
  };
  const s = styles[status] || { bg: 'rgba(255,255,255,0.05)', color: '#888', label: status };
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function CallTable({ rows, columns }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,184,0,0.15)' }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--primary)', fontWeight: 600, letterSpacing: 1, fontSize: 11, textTransform: 'uppercase' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={row.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              {columns.map(c => (
                <td key={c.key} style={{ padding: '12px 14px', color: c.key === 'status' ? undefined : 'var(--text)', verticalAlign: 'middle' }}>
                  {c.key === 'status' ? <StatusBadge status={row[c.key]} /> : row[c.key]}
                </td>
              ))}
            </motion.tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mock live data: callers & active calls ───────────────────────────────────
const LIVE_CALLERS_SEED = [
  { id: 'c1', name: 'Arjun Patel', phone: '+91 98765 43210', avatar: '👨‍💼', query: 'Rescheduling appointment', ringedFor: '0:32' },
  { id: 'c2', name: 'Sarah Johnson', phone: '+1 415-555-2671', avatar: '👩‍⚕️', query: 'Insurance query', ringedFor: '0:18' },
];
const ACTIVE_CALLS_SEED = [
  { id: 'a1', name: 'Raj Sharma', phone: '+91 87654 32109', avatar: '👨', query: 'Slot availability', since: '3:42' },
  { id: 'a2', name: 'Emily Clarke', phone: '+1 408-555-9912', avatar: '👩', query: 'General inquiry', since: '1:15' },
];

// ─── Incoming Panel ───────────────────────────────────────────────────────────
function IncomingPanel() {
  const [callers, setCallers] = useState(LIVE_CALLERS_SEED);
  const [activeCalls, setActiveCalls] = useState(ACTIVE_CALLS_SEED);
  const [logs, setLogs] = useState(MOCK_INCOMING);

  const answerCall = (caller) => {
    setCallers(prev => prev.filter(c => c.id !== caller.id));
    setActiveCalls(prev => [...prev, { ...caller, id: 'a' + Date.now(), since: '0:00' }]);
    toast.success(`Answered: ${caller.name}`);
  };

  const declineCall = (caller) => {
    setCallers(prev => prev.filter(c => c.id !== caller.id));
    const newLog = {
      id: Date.now(), client: caller.name, phone: caller.phone,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Mar 24',
      duration: '—', query: caller.query, status: 'Missed',
    };
    setLogs(prev => [newLog, ...prev]);
    toast.error(`Declined: ${caller.name}`);
  };

  const endCall = (call) => {
    setActiveCalls(prev => prev.filter(c => c.id !== call.id));
    const newLog = {
      id: Date.now(), client: call.name, phone: call.phone,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Mar 24',
      duration: call.since, query: call.query, status: 'Completed',
    };
    setLogs(prev => [newLog, ...prev]);
    toast.success(`Call ended: ${call.name}`);
  };

  const simulateIncoming = () => {
    const names = ['David Kim', 'Zara Ahmed', 'Mike Torres', 'Priya Nair'];
    const avatars = ['👨‍💻', '👩‍🎓', '🧑‍🔬', '👩‍💼'];
    const queries = ['Dental checkup query', 'Appointment rescheduling', 'New patient registration', 'Lab results inquiry'];
    const idx = Math.floor(Math.random() * names.length);
    const newCaller = {
      id: 'c' + Date.now(), name: names[idx], avatar: avatars[idx],
      phone: '+91 ' + Math.floor(90000 + Math.random() * 9999) + ' ' + Math.floor(10000 + Math.random() * 89999),
      query: queries[idx], ringedFor: '0:01',
    };
    setCallers(prev => [...prev, newCaller]);
    toast('📲 New incoming call!', { icon: '📞' });
  };

  const COLUMNS = [
    { key: 'client', label: 'Client Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'time', label: 'Time' },
    { key: 'duration', label: 'Duration' },
    { key: 'query', label: 'Query' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
      {/* Panel Header */}
      <div className="glass" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📥</span>
          <div>
            <h2 style={{ fontSize: 20, margin: 0, color: '#fff' }}>Incoming Calls</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Live client call queue</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
            <span style={{ fontSize: 13, color: '#fbbf24' }}>{callers.length} Ringing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.5 }} />
            <span style={{ fontSize: 13, color: '#4ade80' }}>{activeCalls.length} On Call</span>
          </div>
        </div>
      </div>

      {/* ── Currently Ringing ── */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ color: '#fbbf24', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
            🔔 Ringing ({callers.length})
          </h4>
          <button onClick={simulateIncoming} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, background: 'rgba(255,184,0,0.1)', color: 'var(--primary)', border: '1px solid rgba(255,184,0,0.2)', cursor: 'pointer' }}>
            + Simulate Call
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {callers.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 14 }}>
                No incoming calls right now.
              </motion.div>
            )}
            {callers.map((caller) => (
              <motion.div key={caller.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', position: 'relative' }}
              >
                {/* Ringing aura */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <motion.div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid #fbbf24' }} animate={{ scale: [1, 1.6], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1 }} />
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                    {caller.avatar}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{caller.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{caller.phone}</div>
                  <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>💬 {caller.query}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <motion.span style={{ fontSize: 11, color: '#fbbf24' }} animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                    ⏱ Ringing {caller.ringedFor}
                  </motion.span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => answerCall(caller)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', cursor: 'pointer', fontWeight: 600 }}>✅ Answer</button>
                    <button onClick={() => declineCall(caller)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer', fontWeight: 600 }}>❌ Decline</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Active On-Call ── */}
      <div className="glass" style={{ padding: 20 }}>
        <h4 style={{ color: '#4ade80', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 16px' }}>
          🟢 Currently On Call ({activeCalls.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {activeCalls.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 14 }}>
                No active calls.
              </motion.div>
            )}
            {activeCalls.map((call) => (
              <motion.div key={call.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <motion.div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #4ade80' }} animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                    {call.avatar}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{call.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{call.phone}</div>
                  <div style={{ fontSize: 12, color: '#4ade80', marginTop: 4 }}>💬 {call.query}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <motion.span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }} animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    🕒 {call.since}
                  </motion.span>
                  <button onClick={() => endCall(call)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer', fontWeight: 600 }}>
                    📵 End Call
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Received Calls Table ── */}
      <div className="glass" style={{ padding: 24 }}>
        <h4 style={{ color: 'var(--primary)', marginBottom: 16, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 16px' }}>
          📋 Received Calls Log
        </h4>
        <CallTable rows={logs} columns={COLUMNS} />
      </div>
    </div>
  );
}

// ─── Outgoing / Recall Panel ──────────────────────────────────────────────────
const ONGOING_CALLS_SEED = [
  { id: 'o1', name: 'Alex Kumar', avatar: '👨‍💼', phone: '+14155554901', slot: '3:00 PM, Mar 25', since: '2:10' },
  { id: 'o2', name: 'Priya Nair', avatar: '👩‍💼', phone: '+91887766554', slot: '12:00 PM, Mar 26', since: '0:45' },
];

function OutgoingPanel() {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [callStatus, setCallStatus] = useState(null);
  const [logs, setLogs] = useState(MOCK_OUTGOING);
  const [ongoingCalls, setOngoingCalls] = useState(ONGOING_CALLS_SEED);
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // 'en' or 'te'

  const startLiveAssistant = async () => {
    if (!phone) return toast.error('Please enter a phone number.');
    setCallStatus('calling');
    try {
      await axios.post('/api/calls/voice-assistant/start', { 
        to: phone, 
        language: selectedLanguage 
      });
      toast.success(`Live AI Assistant started (${selectedLanguage === 'en' ? 'English' : 'Telugu'})`);
      const newOngoing = {
        id: 'o' + Date.now(), name: clientName || 'Live Assistant Call', avatar: '🤖',
        phone, slot: 'Interactive AI Session', since: '0:00',
      };
      setOngoingCalls(prev => [...prev, newOngoing]);
      setCallStatus('in-progress');
      setTimeout(() => setCallStatus(null), 3000);
    } catch (e) {
      setCallStatus(null);
      toast.error('Failed to start Live AI: ' + e.message);
    }
  };

  const script = clientName && slot
    ? `Hello ${clientName}, this is a reminder call from VoxAI. Your appointment slot is confirmed for ${slot}. ${notes ? 'Note: ' + notes : ''} Please reply 1 to confirm or 2 to reschedule. Thank you!`
    : 'Fill in client details to preview the AI script...';

  const makeRecallCall = async () => {
    if (!phone || !clientName || !slot) return toast.error('Fill in all required fields.');
    setCallStatus('generating-voice');
    try {
      // 1. Try to generate Murf AI Human Voice
      let voiceUrl = null;
      try {
        const { data: ttsRes } = await axios.post('/api/tts/murf', { text: script });
        voiceUrl = ttsRes.audioUrl;
        setCallStatus('calling');
      } catch (err) {
        console.warn('Murf AI generation failed, falling back to standard voice');
        setCallStatus('calling');
      }

      // 2. Make the call (using either Murf Play or Twilio Say)
      await axios.post('/api/calls/make', { to: phone, script, voiceUrl });
      setCallStatus('in-progress');
      toast.success('Confirmation call sent!');
      
      const newOngoing = {
        id: 'o' + Date.now(), name: clientName, avatar: '📞',
        phone, slot, since: '0:00',
      };
      setOngoingCalls(prev => [...prev, newOngoing]);
      setClientName(''); setPhone(''); setSlot(''); setNotes('');
      setTimeout(() => setCallStatus(null), 3000);
    } catch (e) {
      setCallStatus(null);
      if (e.response?.data?.needsKey) {
        toast('Twilio not configured — logged as demo.', { icon: 'ℹ️' });
        // Demo fallback
        const newOngoing = {
          id: 'o' + Date.now(), name: clientName, avatar: '📞',
          phone, slot, since: '0:00',
        };
        setOngoingCalls(prev => [...prev, newOngoing]);
        setClientName(''); setPhone(''); setSlot(''); setNotes('');
      } else {
        toast.error('Call failed: ' + e.message);
      }
    }
  };

  const COLUMNS = [
    { key: 'client', label: 'Client Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'slot', label: 'Appointment Slot' },
    { key: 'calledAt', label: 'Called At' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
      {/* Panel Header */}
      <div className="glass" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>📤</span>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: '#fff' }}>Recall / Confirmation Calls</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Confirm client appointment slots via AI</p>
        </div>
      </div>

      {/* Form */}
      <div className="glass" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--primary)', fontSize: 12, letterSpacing: 1 }}>CLIENT NAME *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. John Doe" className="glass"
              style={{ width: '100%', padding: '12px 16px', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', borderRadius: 10, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--primary)', fontSize: 12, letterSpacing: 1 }}>PHONE NUMBER *</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" className="glass"
              style={{ width: '100%', padding: '12px 16px', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', borderRadius: 10, fontSize: 14 }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: 'var(--primary)', fontSize: 12, letterSpacing: 1 }}>APPOINTMENT SLOT *</label>
          <input value={slot} onChange={e => setSlot(e.target.value)} placeholder="e.g. 3:00 PM on March 26, 2026" className="glass"
            style={{ width: '100%', padding: '12px 16px', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', borderRadius: 10, fontSize: 14 }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)', fontSize: 12, letterSpacing: 1 }}>ADDITIONAL NOTES (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Bring insurance card" className="glass"
            style={{ width: '100%', padding: '12px 16px', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', borderRadius: 10, fontSize: 14 }} />
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 4px' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>VOICE LANGUAGE:</span>
          <button 
            onClick={() => setSelectedLanguage('en')}
            style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: '1px solid', borderColor: selectedLanguage === 'en' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', background: selectedLanguage === 'en' ? 'rgba(255,184,0,0.1)' : 'transparent', color: selectedLanguage === 'en' ? 'var(--primary)' : '#888', cursor: 'pointer' }}
          >
            🇺🇸 English
          </button>
          <button 
            onClick={() => setSelectedLanguage('te')}
            style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: '1px solid', borderColor: selectedLanguage === 'te' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', background: selectedLanguage === 'te' ? 'rgba(255,184,0,0.1)' : 'transparent', color: selectedLanguage === 'te' ? 'var(--primary)' : '#888', cursor: 'pointer' }}
          >
            🇮🇳 Telugu
          </button>
        </div>

        {/* AI Script Preview */}
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.1)' }}>
          <p style={{ fontSize: 11, color: 'var(--primary)', letterSpacing: 1, marginBottom: 8 }}>AI SCRIPT / CONVERSATION PREVIEW</p>
          <p style={{ fontSize: 14, color: clientName && slot ? '#EBEBEB' : 'var(--text-muted)', lineHeight: 1.6 }}>{script}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <button
            onClick={makeRecallCall}
            disabled={callStatus !== null}
            className="btn-primary"
            style={{ padding: '14px', fontSize: 14, borderRadius: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
          >
            {callStatus === 'generating-voice' ? '⏳ Generating...' :
             callStatus === 'calling' ? '⏳ Connecting...' :
             callStatus === 'in-progress' ? 'Running...' : '📞 Simple Reminder'}
          </button>
          
          <button
            onClick={startLiveAssistant}
            disabled={callStatus !== null}
            className="glass"
            style={{ padding: '14px', fontSize: 14, borderRadius: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, border: '1px solid var(--primary)', color: 'var(--primary)' }}
          >
            🎙️ Start Live AI conversation
          </button>
        </div>
      </div>

      {/* ── Ongoing Outgoing Calls ── */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ color: '#4ade80', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
            🟢 Ongoing Confirmation Calls ({ongoingCalls.length})
          </h4>
          <motion.div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
            <span style={{ fontSize: 12, color: '#4ade80' }}>Live</span>
          </motion.div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {ongoingCalls.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 14 }}>
                No ongoing calls.
              </motion.div>
            )}
            {ongoingCalls.map(call => (
              <motion.div key={call.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}
              >
                {/* Avatar with glow */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <motion.div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #4ade80' }} animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {call.avatar}
                  </div>
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{call.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{call.phone}</div>
                  <div style={{ fontSize: 12, color: '#4ade80', marginTop: 3 }}>📅 Slot: {call.slot}</div>
                </div>
                {/* Timer + End */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <motion.span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }} animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    🕒 {call.since}
                  </motion.span>
                  <button
                    onClick={() => {
                      setOngoingCalls(prev => prev.filter(c => c.id !== call.id));
                      const newLog = {
                        id: Date.now(), client: call.name, phone: call.phone, slot: call.slot,
                        calledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Mar 24',
                        status: 'Confirmed',
                      };
                      setLogs(prev => [newLog, ...prev]);
                      toast.success(`${call.name} confirmed!`);
                    }}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📵 End
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Outgoing Call Log Table */}
      <div className="glass" style={{ padding: 24 }}>
        <h4 style={{ color: 'var(--primary)', marginBottom: 16, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>📋 Slot Confirmation Log</h4>
        <CallTable rows={logs} columns={COLUMNS} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PhoneCalls() {
  return (
    <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100vh', paddingBottom: 48 }}>
      <div>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: 8 }}>Phone Call Center</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Manage incoming queries and outgoing appointment confirmation calls from one dashboard.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <IncomingPanel />
        <OutgoingPanel />
      </div>
    </div>
  );
}
