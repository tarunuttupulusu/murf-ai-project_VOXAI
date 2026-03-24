import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function PhoneCalls() {
  const [phone, setPhone] = useState('');
  const [script, setScript] = useState('Hello, this is VoxAI calling to confirm your appointment.');
  const [callStatus, setCallStatus] = useState(null); // 'calling', 'in-progress', 'completed'
  const [callSid, setCallSid] = useState('');

  const makeCall = async () => {
    if (!phone) return toast.error('Enter a phone number');
    setCallStatus('calling');
    try {
      const { data } = await axios.post('/api/calls/make', { to: phone, script });
      setCallSid(data.callSid);
      setCallStatus('in-progress');
      toast.success('Call triggered successfully!');
      
      // Poll status
      const interval = setInterval(async () => {
        const statusRes = await axios.get(`/api/calls/status/${data.callSid}`);
        if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
          setCallStatus('completed');
          clearInterval(interval);
        }
      }, 5000);
    } catch (e) {
      setCallStatus(null);
      if (e.response?.data?.needsKey) {
        toast.error('Twilio credentials missing. Configure them in API Keys.', { duration: 5000 });
      } else {
        toast.error('Failed to make call: ' + e.message);
      }
    }
  };

  return (
    <div className="page-header" style={{ display: 'flex', gap: 32, height: '100vh', paddingBottom: 32 }}>
      
      {/* Configure Call Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 className="text-gradient">Phone Call Automation</h1>
        <p style={{ color: 'var(--text-muted)' }}>AI will dynamically call the number and speak the script like a human.</p>

        <div className="glass" style={{ padding: 32, flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 16, color: 'var(--cyan)' }}>Destination Phone Number</label>
          <input
            type="text"
            className="glass"
            placeholder="+1234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: '16px 20px', fontSize: 18, color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', marginBottom: 32 }}
          />

          <label style={{ display: 'block', marginBottom: 16, color: 'var(--purple)' }}>AI Call Script (What to say)</label>
          <textarea
            className="glass"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            style={{ width: '100%', height: 200, padding: 16, fontSize: 16, color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', resize: 'none', marginBottom: 32 }}
          />

          <button 
            onClick={makeCall}
            disabled={callStatus === 'calling' || callStatus === 'in-progress'}
            className="btn-primary"
            style={{ width: '100%', padding: 20, fontSize: 18, borderRadius: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}
          >
            {callStatus === 'calling' ? 'Triggering Call...' : '📞 Make Call Now'}
          </button>
        </div>
      </div>

      {/* Live Status Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 100 }} /> {/* Spacer */}
        <div className="glass" style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          <div style={{
            width: 150, height: 150, borderRadius: '50%',
            background: callStatus === 'in-progress' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${callStatus === 'in-progress' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
            marginBottom: 32, position: 'relative'
          }}>
            {callStatus === 'in-progress' && (
              <>
                <motion.div style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '2px solid #22c55e' }} animate={{ scale: [1, 1.5], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                <motion.div style={{ position: 'absolute', inset: -40, borderRadius: '50%', border: '2px solid #22c55e' }} animate={{ scale: [1, 1.5], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }} />
              </>
            )}
            <span style={{ fontSize: 60 }}>{callStatus === 'in-progress' ? '🗣️' : '📲'}</span>
          </div>

          <h2 style={{ fontSize: 24, marginBottom: 12, color: callStatus === 'in-progress' ? '#22c55e' : '#fff' }}>
            {callStatus === 'calling' ? 'Connecting to Twilio...' : 
             callStatus === 'in-progress' ? 'LIVE CALL IN PROGRESS' : 
             callStatus === 'completed' ? 'Call Completed' : 'Ready to Call'}
          </h2>

          <p style={{ color: 'var(--text-muted)' }}>
            {callStatus === 'in-progress' ? `AI is currently speaking to ${phone}` : 
             'Enter number and script to trigger an automated AI phone call.'}
          </p>

          <div style={{ marginTop: 40, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>🔗</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Powered by Twilio & TTS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
