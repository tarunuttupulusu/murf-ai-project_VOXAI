import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function HRInterview() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState('Select your profile and click Start Interview.');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [scores, setScores] = useState({ accuracy: 0, confidence: 0, communication: 0, overall: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Selection State
  const [role, setRole] = useState('Frontend');
  const [topic, setTopic] = useState('React');
  const [level, setLevel] = useState('Medium');

  // Session State
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isReadyPhase, setIsReadyPhase] = useState(false);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [sessionResults, setSessionResults] = useState([]);
  const [showFinalAnalysis, setShowFinalAnalysis] = useState(false);
  const [isLifeboatMode, setIsLifeboatMode] = useState(false);

  const recognitionRef = useRef(null);

  const roles = [
    { id: 'Frontend', icon: '💻', desc: 'Web & Client side' },
    { id: 'Backend', icon: '⚙️', desc: 'Server & Database' },
    { id: 'Full Stack', icon: '🚀', desc: 'End-to-End' },
    { id: 'AI/ML Engineer', icon: '🧠', desc: 'AI & Models' },
    { id: 'DevOps Engineer', icon: '♾️', desc: 'Ops & CI/CD' },
    { id: 'Cloud Engineer', icon: '☁️', desc: 'Cloud Infra' },
    { id: 'Cyber Security', icon: '🛡️', desc: 'Security & Risk' },
    { id: 'Product Manager', icon: '📋', desc: 'Product & Strategy' },
    { id: 'Prompt Engineer', icon: '✍️', desc: 'AI Orchestration' },
    { id: 'Data Science', icon: '📊', desc: 'Data & AI' },
    { id: 'UI/UX', icon: '🎨', desc: 'Design & Experience' },
    { id: 'HR', icon: '🤝', desc: 'Human Resources' }
  ];

  const topics = [
    'Generative AI/LLMs', 'MLOps', 'Cloud Computing', 'DevOps', 'Cybersecurity', 
    'Data Engineering', 'AR/VR Development', 'Blockchain/Web3', 'Edge Computing',
    'Embedded Systems', 'Data Visualization', 'Quantum Computing',
    'React', 'Node.js', 'Java', 'Python', 'JavaScript', 'HTML/CSS',
    'System Design', 'Behavioral'
  ];
  const levels = ['Easy', 'Medium', 'Hard'];

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
        if (finalTrans) {
          setTranscript((prev) => prev + ' ' + finalTrans);
        }
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

      // Delay evaluation slightly to allow last transcript fragments to arrive
      setTimeout(() => {
        setTranscript(prev => {
          const finalTranscript = prev.trim();
          if (finalTranscript.length > 2) evaluateAnswer(finalTranscript);
          else toast('Answer too short to evaluate', { icon: '⚠️' });
          return prev;
        });
      }, 800);
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
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    }
  };

  const startInterview = async () => {
    setInterviewStarted(true);
    setIsReadyPhase(true);
    setSessionResults([]);
    setShowFinalAnalysis(false);
    setIsLifeboatMode(false);
    const briefing = "Namaste! I am your AI Interviewer. Kindly review your selected profile on the right. Once you are comfortable, please click the button below to start our technical session.";
    setQuestion(briefing);
    await speak(briefing);
  };

  const confirmReady = () => {
    setIsReadyPhase(false);
    setIsRecording(false);
    recognitionRef.current?.stop();
    setCurrentQuestionNumber(1);
    getNextQuestion(true);
  };

  const getNextQuestion = async (isFirst = false) => {
    if (!isFirst && currentQuestionNumber >= 10) {
      setShowFinalAnalysis(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.get(`/api/interview/question?role=${role}&topic=${topic}&level=${level}`);
      setQuestion(data.question);
      setTranscript('');
      setAiFeedback(null);
      setScores({ accuracy: 0, confidence: 0, communication: 0, overall: 0 });
      if (data.isLifeboat) setIsLifeboatMode(true);
      if (!isFirst) setCurrentQuestionNumber(prev => prev + 1);
      await speak(data.question);
    } catch (e) {
      toast.error('Failed to generate question. Please check Gemini API key.');
    }
    setIsLoading(false);
  };

  const evaluateAnswer = async (finalTranscript) => {
    const answerToEvaluate = typeof finalTranscript === 'string' ? finalTranscript : transcript;
    setIsLoading(true);
    toast.loading('Analyzing answer...', { id: 'eval' });
    try {
      const { data } = await axios.post('/api/interview/evaluate', {
        question,
        answer: answerToEvaluate,
        role,
        topic,
        level
      });
      setAiFeedback(data.feedback);
      setScores(data.scores);
      if (data.isLifeboat) setIsLifeboatMode(true);

      // Save results
      setSessionResults(prev => [...prev, { question, answer: answerToEvaluate, evaluation: data }]);

      toast.success('Evaluation complete', { id: 'eval' });
      await speak(data.feedback, 'female'); // AI evaluator voice

      // Wait 3 seconds then go to next question automatically
      setTimeout(() => {
        if (currentQuestionNumber < 10) getNextQuestion();
        else setShowFinalAnalysis(true);
      }, 5000);

    } catch (e) {
      toast.error('Evaluation failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: 32, minHeight: '100vh', paddingBottom: 64 }}>
      {!interviewStarted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ textAlign: 'center' }}>
            <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: 16 }}>Professional AI Interviewer</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 18 }}>Select your focus areas to build your custom interview session</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Role Cards */}
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 20, fontSize: 16, color: 'var(--cyan)' }}>CHOOSE YOUR ROLE</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {roles.map(r => (
                  <div key={r.id} onClick={() => setRole(r.id)}
                    style={{
                      padding: '16px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      background: role === r.id ? 'rgba(255, 184, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${role === r.id ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.3s'
                    }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{r.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.id}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack Selection */}
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 20, fontSize: 16, color: 'var(--purple)' }}>TECHNICAL DOMAIN</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {topics.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    style={{ 
                      padding: '8px 16px', borderRadius: 20, fontSize: 11, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: topic === t ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: topic === t ? '#000' : 'rgba(255,255,255,0.5)',
                      fontWeight: topic === t ? 700 : 400
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Cards */}
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 20, fontSize: 16, color: '#ff0060' }}>CHALLENGE LEVEL</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {levels.map(l => (
                  <div key={l} onClick={() => setLevel(l)}
                    style={{
                      padding: 16, borderRadius: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: level === l ? 'rgba(255, 184, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${level === l ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}`
                    }}>
                    <span style={{ fontWeight: 600 }}>{l}</span>
                    {level === l && <span>⚡</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={startInterview} className="btn-primary" style={{ padding: '20px 80px', fontSize: 18, borderRadius: 50 }}>
              Enter Interview Room 🚪
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <h1 className="text-gradient">AI Interview Room</h1>
              <p style={{ color: 'var(--text-muted)' }}>{isReadyPhase ? 'Awaiting Confirmation' : `Question ${currentQuestionNumber} of 10`} • {role} • {topic}</p>
            </div>
            {isLifeboatMode && (
              <div style={{ background: 'rgba(255, 184, 0, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: 10, padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>
                INTERVIEWER LIFEBOAT ACTIVE
              </div>
            )}
          </div>
          <button onClick={() => setInterviewStarted(false)} className="btn-ghost tag tag-purple">Exit Interview</button>
        </div>
      )}

      {interviewStarted && !showFinalAnalysis && (
        <div style={{ display: 'flex', gap: 32, flex: 1 }}>
          {/* Left Column: Interviewer & Input */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* AI Question Panel */}
            <motion.div className="glass" style={{ padding: 48, position: 'relative', overflow: 'hidden', display: 'flex', gap: 40, alignItems: 'center' }}
              animate={{ borderColor: isLoading ? 'var(--primary)' : 'rgba(255,255,255,0.08)' }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, boxShadow: '0 0 30px rgba(255, 184, 0, 0.3)' }}>
                👤
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--primary)', marginBottom: 12 }}>AI INTERVIEWER</div>
                <h2 style={{ fontSize: 26, lineHeight: 1.4, color: '#fff' }}>"{question}"</h2>
              </div>
            </motion.div>

            {/* User Answer Panel */}
            <div className="glass" style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ fontSize: '14px', color: 'var(--purple)', marginBottom: 24 }}>YOUR RESPONSE</div>

              <div style={{ flex: 1, fontSize: 20, lineHeight: 1.6, color: transcript ? '#EBEBEB' : 'rgba(235,235,235,0.3)' }}>
                {transcript || (isReadyPhase ? 'Click the button on the right to start...' : 'Start speaking your answer...')}
                {isRecording && <span style={{ animation: 'pulse-ring 1s infinite' }}> |</span>}
              </div>

              {!isReadyPhase && (
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
              )}
            </div>
          </div>

          {/* Right Column: Live Scorecard */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="glass" style={{ padding: 32, flex: 1 }}>
              <h3 style={{ fontSize: 18, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📊</span> Performance Insight
              </h3>

              {isReadyPhase ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                  <div style={{ fontSize: 48 }}>💡</div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                      You have selected the <b>{role}</b> profile with a focus on <b>{topic}</b> at <b>{level}</b> difficulty. 
                      Kindly ensure your microphone is working correctly before we proceed.
                    </p>
                  </div>
                  <button onClick={confirmReady} className="btn-primary" style={{ width: '100%', padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 0 20px rgba(255, 184, 0, 0.2)' }}>
                    Begin Interview Session 🚀
                  </button>
                  <p style={{ fontSize: 11, opacity: 0.5 }}>By clicking above, you agree to start the 10-question evaluation.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <ScoreRing label="Question Score" score={scores.overall} primary color="var(--cyan)" />
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                      <ScoreRing label="Accuracy" score={scores.accuracy} color="#8A2BE2" />
                      <ScoreRing label="Confidence" score={scores.confidence} color="#ff0060" />
                      <ScoreRing label="Delivery" score={scores.communication} color="#22c55e" />
                    </div>
                  </div>
                  <AnimatePresence>
                    {aiFeedback && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ marginTop: 40, padding: 20, background: 'rgba(255, 184, 0, 0.05)', borderRadius: 16, border: '1px solid rgba(255, 184, 0, 0.1)' }}>
                        <h4 style={{ color: 'var(--primary)', fontSize: 14, marginBottom: 8 }}>INTERVIEWER NOTES</h4>
                        <p style={{ fontSize: 14, lineHeight: 1.5 }}>{aiFeedback}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showFinalAnalysis && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass" style={{ padding: 60, textAlign: 'center' }}>
          <h2 className="text-gradient" style={{ fontSize: 64, marginBottom: 20 }}>Mission Accomplished</h2>
          <p style={{ fontSize: 20, color: 'var(--text-muted)', marginBottom: 60 }}>Comprehensive Performance Analysis for {role} ({topic})</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40, textAlign: 'left' }}>
            <div className="glass" style={{ padding: 40 }}>
              <h3 style={{ color: 'var(--cyan)', marginBottom: 32 }}>Overall Statistics</h3>
              <ScoreRing label="Final Grade" score={Math.round(sessionResults.reduce((acc, r) => acc + r.evaluation.scores.overall, 0) / (sessionResults.length || 1))} primary color="var(--cyan)" />
            </div>
            <div className="glass" style={{ padding: 40 }}>
              <h3 style={{ color: 'var(--purple)', marginBottom: 32 }}>Answer Breakdown</h3>
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {sessionResults.map((r, i) => (
                  <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                    <div style={{ color: 'var(--cyan)', fontWeight: 600, marginBottom: 4 }}>QUESTION {i + 1}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.evaluation.scores.overall}/100</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => setInterviewStarted(false)} className="btn-primary" style={{ marginTop: 80, padding: '20px 60px' }}>Start New Session</button>
        </motion.div>
      )}
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
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
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
