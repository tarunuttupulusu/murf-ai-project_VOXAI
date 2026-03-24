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
app.use(express.json());

// Routes
app.use('/api/tts', require('./routes/tts'));
app.use('/api/stt', require('./routes/stt'));
app.use('/api/translate', require('./routes/translate'));
app.use('/api/interview', require('./routes/interview'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/config', require('./routes/config'));

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
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const tasks = await Task.find({ completed: false, reminderAt: { $lte: now }, reminded: false });
    tasks.forEach(async (task) => {
      io.emit('reminder', { task });
      task.reminded = true;
      await task.save();
    });
  } catch (e) { /* DB offline */ }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 VoxAI Server running on port ${PORT}`));
