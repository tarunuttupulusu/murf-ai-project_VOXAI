const express = require('express');
const router = express.Router();
const axios = require('axios');

const INTERVIEW_QUESTIONS = [
  "Tell me about yourself and your background.",
  "What are your greatest strengths and how do they apply to this role?",
  "Describe a challenging situation you faced at work and how you resolved it.",
  "Where do you see yourself in 5 years?",
  "Why do you want to work for our company?",
  "What is your greatest weakness and what are you doing to improve it?",
  "Tell me about a time you demonstrated leadership skills.",
  "How do you handle pressure and tight deadlines?",
  "Describe your ideal work environment.",
  "Do you have any questions for us?"
];

// Get next interview question
router.get('/question', (req, res) => {
  const idx = Math.floor(Math.random() * INTERVIEW_QUESTIONS.length);
  res.json({ question: INTERVIEW_QUESTIONS[idx], index: idx, total: INTERVIEW_QUESTIONS.length });
});

// Evaluate answer using OpenAI
router.post('/evaluate', async (req, res) => {
  const { question, answer } = req.body;
  if (!answer || answer.trim().length < 3) {
    return res.json({ feedback: 'Please provide a more detailed answer.', scores: { accuracy: 0, confidence: 0, communication: 0, overall: 0 } });
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Simulated evaluation without OpenAI
    const wordCount = answer.trim().split(' ').length;
    const accuracy = Math.min(90, 50 + wordCount * 2);
    const confidence = Math.min(95, 45 + wordCount * 1.5);
    const communication = Math.min(92, 55 + wordCount * 1.8);
    const overall = Math.round((accuracy + confidence + communication) / 3);
    return res.json({
      feedback: `Good attempt! You covered ${wordCount} words. Try to be more specific with examples and quantify your achievements. Structure your answer using the STAR method (Situation, Task, Action, Result).`,
      scores: { accuracy: Math.round(accuracy), confidence: Math.round(confidence), communication: Math.round(communication), overall }
    });
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: 'You are an HR interview evaluator. Score the answer on: accuracy (relevance), confidence (assertiveness), communication (clarity). Return JSON with: feedback (string, 2-3 sentences), scores: { accuracy: 0-100, confidence: 0-100, communication: 0-100, overall: 0-100 }'
      }, {
        role: 'user',
        content: `Question: "${question}"\nAnswer: "${answer}"\nEvaluate and return JSON only.`
      }],
      temperature: 0.7,
    });
    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
