const express = require('express');
const router = express.Router();
const twilio = require('twilio');

router.post('/make', async (req, res) => {
  const { to, script, voiceUrl } = req.body;

  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_account_sid_here') {
    return res.status(400).json({
      error: 'Twilio credentials not configured',
      needsKey: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']
    });
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // TwiML to make AI speak
    const twiml = `<Response><Say voice="Polly.Joanna">${script || 'Hello, this is an automated call from VoxAI. Have a great day!'}</Say></Response>`;
    const encodedTwiml = Buffer.from(twiml).toString('base64');

    const call = await client.calls.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml
    });

    res.json({ callSid: call.sid, status: call.status, to: call.to });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get call status
router.get('/status/:callSid', async (req, res) => {
  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_account_sid_here') {
    return res.status(400).json({ error: 'Twilio credentials not configured' });
  }
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const call = await client.calls(req.params.callSid).fetch();
    res.json({ status: call.status, duration: call.duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
