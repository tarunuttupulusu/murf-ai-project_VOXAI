const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  type: { type: String, enum: ['interview', 'translate', 'voice', 'call'], required: true },
  input: { type: String },
  output: { type: String },
  score: { type: Number },
  language: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', HistorySchema);
