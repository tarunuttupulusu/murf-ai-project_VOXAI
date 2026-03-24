const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QUESTION_LIFEBOAT = {
  "Frontend": [
    "Could you kindly explain the major differences between the Virtual DOM and the Real DOM in React?",
    "How would you optimize a web application to achieve a high performance score on Lighthouse?",
    "Could you please elaborate on the core principles of CSS Flexbox and Grid, and when to use each?",
    "What is your approach to ensuring cross-browser compatibility for modern web features?"
  ],
  "Backend": [
    "Kindly explain how you would design a scalable microservices architecture for a high-traffic e-commerce platform.",
    "Could you please describe the common strategies for database indexing and how they impact query performance?",
    "How do you typically handle secrets and sensitive environment variables in a production Node.js environment?",
    "Could you elaborate on the difference between SQL and NoSQL databases in terms of ACID compliance?"
  ],
  "AI/ML Engineer": [
    "Kindly explain the concept of Transformers and why they revolutionized Natural Language Processing.",
    "Could you please describe your process for fine-tuning a Large Language Model for a specific domain task?",
    "What are the major challenges you face when deploying machine learning models to production (MLOps)?",
    "How would you mitigate bias in a dataset used for training a recommendation engine?"
  ],
  "DevOps Engineer": [
    "Could you kindly explain the core principles of Infrastructure as Code and how you implement it with Terraform?",
    "How would you design a robust CI/CD pipeline for a containerized application using Docker and Kubernetes?",
    "What is your strategy for monitoring and logging in a large-scale distributed system?",
    "Could you please elaborate on the concept of 'Shift Left' security in the DevOps lifecycle?"
  ],
  "General": [
    "Could you please introduce yourself and tell me about a challenging project you completed recently?",
    "Kindly explain how you handle disagreements or conflicts within a professional technical team.",
    "What is your process for keeping up with the rapidly evolving technology landscape in your field?",
    "Could you please describe a situation where you had to learn a new technology on a very tight deadline?"
  ]
};

const getLifeboatQuestion = (role, topic) => {
  const pool = QUESTION_LIFEBOAT[role] || QUESTION_LIFEBOAT["General"];
  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx];
};

// Get next interview question based on role, topic, and level
router.get('/question', async (req, res) => {
  const { role, topic, level } = req.query;
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
    console.warn('⚠️ OpenAI API Key missing, launching Interview Lifeboat');
    const question = getLifeboatQuestion(role, topic);
    return res.json({ question, isLifeboat: true });
  }

  try {
    const prompt = `You are an expert HR interviewer from a top Indian tech firm. Generate a single professional interview question for a ${role || 'General'} candidate specializing in ${topic || 'General Technology'}. The difficulty level should be ${level || 'Medium'}. 
    IMPORTANT: Phrasing should be in clear, professional Indian English (e.g., using terms like "Kindly explain", "Could you please elaborate", or focusing on common industry contexts in India). 
    Return ONLY the question text without any preamble or quotes.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const question = response.choices[0].message.content.trim();
    if (!question || question.length < 5) throw new Error("Empty response from AI");
    res.json({ question });
  } catch (err) {
    console.error('⚠️ OpenAI failing, launching Interview Lifeboat:', err.message);
    const question = getLifeboatQuestion(role, topic);
    res.json({ question, isLifeboat: true });
  }
});

// Evaluate answer using Gemini
router.post('/evaluate', async (req, res) => {
  const { question, answer, role, topic, level } = req.body;
  if (!answer || answer.trim().length < 3) {
    return res.json({ 
      feedback: 'Please provide a more detailed answer.', 
      scores: { accuracy: 0, confidence: 0, communication: 0, overall: 0 } 
    });
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
    const wordCount = (answer || "").split(' ').length;
    const scoreBase = Math.min(85, 45 + wordCount * 1.5);
    return res.json({
      feedback: `Thank you for your detailed response. Kindly ensure you elaborate more on specific frameworks and past project challenges to further demonstrate your expertise.`,
      scores: {
        accuracy: Math.round(scoreBase * 0.9),
        confidence: Math.round(scoreBase),
        communication: Math.round(scoreBase * 1.1),
        overall: Math.round(scoreBase)
      },
      isLifeboat: true
    });
  }

  try {
    const prompt = `You are an expert HR evaluator from a top Indian tech firm. Evaluate the following interview answer in professional Indian English.
Question: "${question}"
Candidate's Answer: "${answer}"
Context: Role is ${role || 'General'}, Topic is ${topic || 'General'}, Difficulty is ${level || 'Medium'}.

Provide a concise feedback in 2-3 sentences using polite, professional Indian English phrasing. 
Score the answer from 0-100 on:
1. Accuracy: How technically correct/relevant is the answer?
2. Confidence: How assertive and articulated is the tone?
3. Communication: Clarity and structure (STAR method).
4. Overall: Weighted average.

Return the result in ONLY JSON format like this:
{
  "feedback": "...",
  "scores": {
    "accuracy": 85,
    "confidence": 70,
    "communication": 80,
    "overall": 78
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const evaluation = JSON.parse(response.choices[0].message.content.trim());
    res.json(evaluation);
  } catch (err) {
    console.error('⚠️ OpenAI evaluation failing, launching Evaluation Lifeboat:', err.message);
    const wordCount = (answer || "").split(' ').length;
    const scoreBase = Math.min(85, 45 + wordCount * 1.5);
    res.json({
      feedback: `Thank you for your detailed response. Kindly ensure you elaborate more on specific frameworks and past project challenges to further demonstrate your expertise.`,
      scores: {
        accuracy: Math.round(scoreBase * 0.9),
        confidence: Math.round(scoreBase),
        communication: Math.round(scoreBase * 1.1),
        overall: Math.round(scoreBase)
      },
      isLifeboat: true
    });
  }
});

module.exports = router;
