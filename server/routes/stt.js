const express = require('express');
const router = express.Router();

// STT is handled browser-side via Web Speech API
// This route handles any server-side processing needed
router.post('/process', (req, res) => {
  const { transcript, lang } = req.body;
  res.json({ transcript, lang, processed: true });
});

module.exports = router;
