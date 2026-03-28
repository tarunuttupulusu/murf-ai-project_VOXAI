const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Routes
app.use('/api/tts', require('./routes/tts'));
app.use('/api/stt', require('./routes/stt'));
app.use('/api/translate', require('./routes/translate'));
app.use('/api/interview', require('./routes/interview'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/config', require('./routes/config'));
app.use('/api/auth/google', require('./routes/googleAuth'));

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voxai')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('⚠️  MongoDB not connected (offline mode):', err.message));

// Socket.io
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('transcript', (data) => {
    socket.broadcast.emit('transcript', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Task reminder cron — check every minute
const Task = require('./models/Task');
const { sendTaskReminder } = require('./utils/mailer');
const axios = require('axios'); // For making internal Twilio call request

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const in30Mins = new Date(now.getTime() + 30 * 60000);
    const windowStart = new Date(in30Mins.getTime() - 30000);
    const windowEnd = new Date(in30Mins.getTime() + 30000);

    // 1. Check for immediate real-time desktop reminders
    const immediateTasks = await Task.find({ completed: false, reminderAt: { $lte: now }, reminded: false });
    immediateTasks.forEach(async (task) => {
      io.emit('reminder', { task });
      task.reminded = true;
      await task.save();
    });

    // 2. Check for 30-minute advance email reminders (Only if isImportant is true!)
    const upcomingTasks = await Task.find({ 
      completed: false, 
      isImportant: true,
      reminderAt: { $gte: windowStart, $lte: windowEnd }, 
      emailSent: false,
      userEmail: { $exists: true, $ne: '' }
    });

    upcomingTasks.forEach(async (task) => {
      const timeStr = task.reminderAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sent = await sendTaskReminder(task.userEmail, task.title, timeStr);
      if (sent) {
        task.emailSent = true;
        await task.save();
      }
    });

    // 3. Check for overdue important tasks to trigger a phone call
    const overdueTasks = await Task.find({
      completed: false,
      isImportant: true,
      reminderAt: { $lte: now },
      callSent: false,
      userPhone: { $exists: true, $ne: '' }
    });

    overdueTasks.forEach(async (task) => {
      console.log(`📞 Placing automated call to ${task.userPhone} for overdue task: ${task.title}`);
      try {
        await axios.post(`http://localhost:${process.env.PORT || 5000}/api/calls/make`, {
          to: task.userPhone,
          script: `Hello! This is your VoxAI Assistant. You have an important overdue task: ${task.title}. Please complete it soon. Have a great day!`
        });
        task.callSent = true;
        await task.save();
      } catch (err) {
        console.error('❌ Failed to place overdue task call:', err.message);
      }
    });

  } catch (e) { console.error('Cron Error:', e.message); }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 VoxAI Server running on port ${PORT}`));
