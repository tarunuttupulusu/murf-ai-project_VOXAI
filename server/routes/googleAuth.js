const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get auth URL
router.get('/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events']
  });
  res.json({ url });
});

// Callback to exchange code for tokens
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    // In a real app, save tokens to User model. Here we'll return them (NOT SECURE for production)
    res.json(tokens);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
