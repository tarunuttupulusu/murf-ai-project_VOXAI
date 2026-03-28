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
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ],
    prompt: 'select_account' // Forces account selection every time
  });
  res.json({ url });
});

// Callback to handle the redirect (GET)
// Exchanges code for tokens and notifies the main window automatically
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    // Send tokens and email back to main window and self-close
    res.send(`
      <html>
        <body style="font-family: sans-serif; background: #050505; color: #fff; padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h2 style="color: #FFB800;">Syncing with VoxAI...</h2>
          <p>Please wait while we connect your calendar.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                tokens: ${JSON.stringify(tokens)},
                email: "${userInfo.email}"
              }, '*');
              window.close();
            } else {
              document.body.innerHTML = '<h2 style="color: #FFB800;">Google Authorization Success!</h2><p>You can now close this window and return to the app.</p>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`);
  }
});

// Callback to exchange code for tokens (used by frontend)
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.json(tokens);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
