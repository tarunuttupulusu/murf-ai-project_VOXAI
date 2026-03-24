const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ reminderAt: 1 });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a task
router.post('/', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.json(task);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Parse voice command to task (NLP-lite)
router.post('/parse', async (req, res) => {
  const { text } = req.body;
  const lower = text.toLowerCase();

  // Time extraction
  let reminderAt = null;
  const timeMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    const now = new Date();
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || '0');
    const ampm = timeMatch[3];
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    reminderAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    if (reminderAt < now) reminderAt.setDate(reminderAt.getDate() + 1);
  }

  // Title extraction
  let title = text.replace(/set (a )?reminder/i, '').replace(/remind me to/i, '').replace(/at \d{1,2}(:\d{2})?\s*(am|pm)?/i, '').trim();
  if (!title) title = text;

  // Category detection
  let category = 'reminder';
  if (/math|english|study|learn|practice|read|homework/i.test(lower)) category = 'learning';
  if (/interview|meeting|call/i.test(lower)) category = 'work';

  res.json({ title: title || text, reminderAt, category });
});

module.exports = router;
