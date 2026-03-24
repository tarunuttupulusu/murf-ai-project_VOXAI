import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function HRInterview() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState('Click start, and I will ask you an interview question.');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [scores, setScores] = useState({ accuracy: 0, confidence: 0, communication: 0, overall: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Setup Web Speech API for Speech-to-Text
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
      recognition.onend = () => { if (isRecording) recognition.start(); }; // Keep alive
      recognitionRef.current = recognition;
    } else {
      toast.error('Browser does not support Speech Recognition');
    }
    
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (transcript.trim().length > 5) evaluateAnswer();
      else toast('Answer too short to evaluate', { icon: '⚠️' });
    } else {
      setTranscript('');
      setAiFeedback(null);
      setScores({ accuracy: 0, confidence: 0, communication: 0, overall: 0 });
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const speak = async (text, voicePreset = 'professional') => {
    try {
      const res = await axios.post('/api/voice/generate', { text, preset: voicePreset });
      const audio = new Audio(res.data.audioUrl);
      audio.play();
    } catch (e) {
      if (e.response?.data?.fallback === 'browser') {
        const u = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(u);
      } else {
        toast.error('TTS failed: ' + e.message);
      }
    }
  };

  const getNextQuestion = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/interview/question');
      setQuestion(data.question);
      setTranscript('');
      setAiFeedback(null);
      setScores({ accuracy: 0, confidence: 0, communication: 0, overall: 0 });
      await speak(data.question);
    } catch (e) {
      toast.error('Failed to get question');
    }
    setIsLoading(false);
  };

  const evaluateAnswer = async () => {
    setIsLoading(true);
    toast.loading('Analyzing answer...', { id: 'eval' });
    try {
      const { data } = await axios.post('/api/interview/evaluate', { question, answer: transcript });
      setAiFeedback(data.feedback);
      setScores(data.scores);
      toast.success('Evaluation complete', { id: 'eval' });
      await speak(data.feedback, 'female'); // AI evaluator voice
    } catch (e) {
      toast.error('Evaluation failed', { id: 'eval' });
    }
    setIsLoading(false);
  };

  return (
    <div className="page-header" style={{ display: 'flex', gap: 32, height: '100vh', paddingBottom: 32 }}>
      {/* Left Column: Interviewer & Input */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="text-gradient">HR Mock Interview</h1>
            <p style={{ color: 'var(--text-muted)' }}>Speech-to-Speech AI evaluation</p>
          </div>
          <button onClick={getNextQuestion} disabled={isLoading || isRecording} className="btn-ghost tag tag-cyan">
            {isLoading ? 'Loading...' : 'Next Question 🔄'}
          </button>
        </div>

        {/* AI Question Panel */}
        <motion.div className="glass" style={{ padding: 40, position: 'relative', overflow: 'hidden' }}
          animate={{ borderColor: isLoading ? 'rgba(0,245,255,0.5)' : 'rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--cyan)', marginBottom: 16 }}>AI Interviewer asks:</div>
          <h2 style={{ fontSize: 28, lineHeight: 1.4, color: '#fff', fontWeight: 500 }}>"{question}"</h2>
        </motion.div>

        {/* User Answer Panel */}
        <div className="glass" style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ fontSize: '14px', color: 'var(--purple)', marginBottom: 24 }}>YOUR ANSWER (LIVE TRANSCRIPT)</div>
          
          <div style={{ flex: 1, fontSize: 18, lineHeight: 1.6, color: transcript ? '#EBEBEB' : 'rgba(235,235,235,0.3)' }}>
            {transcript || 'Press the mic button and start speaking your answer...' }
            {isRecording && <span style={{ animation: 'pulse-ring 1s infinite' }}> |</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <button 
              onClick={toggleRecording} 
              className={`mic-btn ${isRecording ? 'active' : 'inactive'}`}
              disabled={isLoading}
            >
              {isRecording && <div className="pulse-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #ff0060' }} />}
              <span style={{ fontSize: 32, zIndex: 2 }}>{isRecording ? '⏹' : '🎤'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Scorecard */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="glass" style={{ padding: 32, flex: 1 }}>
          <h3 style={{ fontSize: 18, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📊</span> Performance Card
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <ScoreRing label="Overall Score" score={scores.overall} primary color="var(--cyan)" />
            <div style={{ display: 'flex', gap: 24, justifyContent: 'space-between' }}>
              <ScoreRing label="Accuracy" score={scores.accuracy} color="#8A2BE2" />
              <ScoreRing label="Confidence" score={scores.confidence} color="#ff0060" />
              <ScoreRing label="Delivery" score={scores.communication} color="#22c55e" />
            </div>
          </div>

          <AnimatePresence>
            {aiFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 40, padding: 24, background: 'rgba(0,245,255,0.05)', borderRadius: 12, border: '1px solid rgba(0,245,255,0.1)' }}
              >
                <h4 style={{ color: 'var(--cyan)', marginBottom: 12 }}>AI Feedback</h4>
                <p style={{ fontSize: 15, lineHeight: 1.6 }}>{aiFeedback}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score, label, color, primary }) {
  const size = primary ? 120 : 80;
  const stroke = primary ? 8 : 6;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg fill="none" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
          <motion.circle 
            cx={size/2} cy={size/2} r={radius} 
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: primary ? 28 : 16, fontWeight: 700 }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
