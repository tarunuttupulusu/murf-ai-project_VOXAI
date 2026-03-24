const axios = require('axios');
require('dotenv').config();

axios.get('https://api.murf.ai/v1/speech/voices', {
  headers: { 'api-key': process.env.MURF_API_KEY }
}).then(res => {
  console.log("SUCCESS. Fetched", res.data.length, "voices.");
  console.log("Example 1:", JSON.stringify(res.data[0], null, 2));
  console.log("Example 2:", JSON.stringify(res.data[20], null, 2));
}).catch(err => {
  console.log("ERROR:", err.response?.data || err.message);
});
