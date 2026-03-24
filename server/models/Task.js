const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'general' }, // learning, reminder, etc.
  reminderAt: { type: Date },
  completed: { type: Boolean, default: false },
  reminded: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  isImportant: { type: Boolean, default: false },
  callSent: { type: Boolean, default: false },
  googleEventId: { type: String },
  userEmail: { type: String },
  userPhone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
