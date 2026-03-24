import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

export default function TaskAssistant() {
  const [tasks, setTasks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetchTasks();
    const socket = io('http://localhost:5000');
    socket.on('reminder', ({ task }) => {
      toast('Reminder: ' + task.title, { icon: '⏰', duration: 10000 });
      const u = new SpeechSynthesisUtterance('Reminder: ' + task.title);
      window.speechSynthesis.speak(u);
      fetchTasks();
    });
    return () => socket.disconnect();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await axios.get('/api/tasks');
      setTasks(data);
    } catch (e) { toast.error('Failed to load tasks'); }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.onresult = (e) => setTranscript(e.results[0][0].transcript);
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => {
        setIsRecording(false);
        if (transcript) handleVoiceCommand(transcript);
      };
      recognitionRef.current = recognition;
    }
  }, [transcript]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleVoiceCommand = async (text) => {
    toast.loading('Parsing command...', { id: 'cmd' });
    try {
      const { data } = await axios.post('/api/tasks/parse', { text });
      await axios.post('/api/tasks', data);
      toast.success(`Task added: ${data.title}`, { id: 'cmd' });
      fetchTasks();
    } catch (e) {
      toast.error('Failed to add task', { id: 'cmd' });
    }
  };

  const toggleComplete = async (task) => {
    try {
      await axios.put(`/api/tasks/${task._id}`, { completed: !task.completed });
      fetchTasks();
    } catch (e) { toast.error('Failed to update task'); }
  };

  return (
    <div className="page-header" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <h1 className="text-gradient" style={{ marginBottom: 16 }}>Learning Task Assistant</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>Set daily learning schedules using voice commands.</p>

      {/* Voice Input Bar */}
      <div className="glass" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
        <button onClick={toggleRecording} className={`mic-btn ${isRecording ? 'active' : 'inactive'}`} style={{ width: 60, height: 60 }}>
          <span style={{ fontSize: 24 }}>{isRecording ? '⏹' : '🎤'}</span>
        </button>
        <div style={{ flex: 1, fontSize: 18, color: '#fff' }}>
          {isRecording ? <span style={{ color: 'var(--cyan)' }}>Listening... {transcript}</span> : 
           <span style={{ color: 'var(--text-muted)' }}>Say "Set a reminder to practice math at 6 PM"</span>}
        </div>
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tasks.map(task => (
          <motion.div 
            key={task._id}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className={`glass ${task.completed ? '' : 'glow-cyan'}`}
            style={{ 
              padding: 24, display: 'flex', alignItems: 'center', gap: 24,
              opacity: task.completed ? 0.5 : 1, transition: 'all 0.3s'
            }}
          >
            <input 
              type="checkbox" 
              checked={task.completed} 
              onChange={() => toggleComplete(task)}
              style={{ width: 24, height: 24, accentColor: 'var(--cyan)', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, color: '#fff', textDecoration: task.completed ? 'line-through' : 'none', marginBottom: 8 }}>{task.title}</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                <span className={`tag tag-${task.category === 'learning' ? 'green' : 'purple'}`}>
                  {task.category.toUpperCase()}
                </span>
                {task.reminderAt && (
                  <span style={{ fontSize: 14, color: 'var(--cyan)' }}>
                    ⏰ {new Date(task.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            No tasks found. Use voice command to schedule your learning!
          </div>
        )}
      </div>
    </div>
  );
}
